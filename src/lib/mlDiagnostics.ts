import {
  Alert,
  DailyGenerationPoint,
  Installation,
  MLAnomalyPoint,
  MLDiagnosticFeature,
  MLPredictiveReport,
  RiskLevel,
  SolarReading,
} from '../types'

export interface PredictiveAlertCandidate {
  category: string
  component_target: 'panel' | 'inverter' | 'thermal'
  severity: 'info' | 'warning'
  title: string
  message: string
  confidence: number
  risk_score: number
  predicted_days_to_critical: number | null
  recommended_action: string
  model_signals: string[]
}

export interface MLAnalysisResult {
  report: Omit<MLPredictiveReport, 'newly_triggered_alerts' | 'predictive_alerts'>
  candidates: PredictiveAlertCandidate[]
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mad(values: number[]): number {
  if (values.length === 0) return 0
  const med = median(values)
  const deviations = values.map(v => Math.abs(v - med))
  return median(deviations)
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

/**
 * Ordinary Least Squares (OLS) simple linear regression: y = slope * x + intercept
 */
function linearRegression(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 1, r2: 0 }

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += ys[i]
    sumXY += i * ys[i]
    sumXX += i * i
  }

  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-9) {
    return { slope: 0, intercept: sumY / n, r2: 0 }
  }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const yMean = sumY / n
  let ssTot = 0
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const yHat = slope * i + intercept
    ssTot += (ys[i] - yMean) ** 2
    ssRes += (ys[i] - yHat) ** 2
  }

  const r2 = ssTot > 1e-9 ? Math.max(0, 1 - ssRes / ssTot) : 0
  return { slope, intercept, r2 }
}

/**
 * Exponentially Weighted Moving Average (EWMA)
 */
function computeEwma(values: number[], alpha = 0.4): number[] {
  if (values.length === 0) return []
  const result = [values[0]]
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1])
  }
  return result
}

function classifyRisk(scoreOutOf100: number): RiskLevel {
  if (scoreOutOf100 >= 70) return 'high'
  if (scoreOutOf100 >= 45) return 'elevated'
  if (scoreOutOf100 >= 22) return 'moderate'
  return 'low'
}

export function analyzeInstallationTelemetry(
  installation: Installation,
  readings: SolarReading[],
  dailyGeneration: DailyGenerationPoint[]
): MLAnalysisResult {
  const ratedWatts = Math.max(installation.capacity_kw * 1000, 1000)

  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Group readings by day for multivariate feature extraction
  const readingsByDay = new Map<string, SolarReading[]>()
  for (const r of sortedReadings) {
    const day = r.timestamp.slice(0, 10)
    if (!readingsByDay.has(day)) readingsByDay.set(day, [])
    readingsByDay.get(day)!.push(r)
  }

  const daytimeReadings = sortedReadings.filter(
    r => (r.irradiance_w_m2 ?? 0) >= 80 && r.power_w >= 0
  )

  // 1. Irradiance-to-Power Expected Linear Model + Residuals
  // Expected DC-to-AC conversion efficiency with standard thermal coefficient (-0.4%/°C above 25°C)
  const powerResidualsNorm: number[] = []
  const thermalDeltas: number[] = []
  const voltages: number[] = []

  for (const r of daytimeReadings) {
    const irr = r.irradiance_w_m2 ?? 0
    const temp = r.temperature_c ?? 25
    const tempDerating = temp > 25 ? Math.max(0.65, 1 - 0.004 * (temp - 25)) : 1.0
    const expectedPowerW = ratedWatts * (irr / 1000) * tempDerating
    const residualNorm = (r.power_w - expectedPowerW) / ratedWatts
    powerResidualsNorm.push(residualNorm)

    const expectedNoctTemp = 25 + (irr / 800) * 20
    thermalDeltas.push(temp - expectedNoctTemp)

    if (r.voltage_v !== null && r.voltage_v > 0) {
      voltages.push(r.voltage_v)
    }
  }

  // Recent 48h window vs historical baseline
  const recentWindowCount = Math.min(daytimeReadings.length, 24)
  const recentReadings = daytimeReadings.slice(-recentWindowCount)
  const recentResiduals: number[] = []
  const recentVoltages: number[] = []
  const recentThermalDeltas: number[] = []

  for (const r of recentReadings) {
    const irr = r.irradiance_w_m2 ?? 0
    const temp = r.temperature_c ?? 25
    const tempDerating = temp > 25 ? Math.max(0.65, 1 - 0.004 * (temp - 25)) : 1.0
    const expectedPowerW = ratedWatts * (irr / 1000) * tempDerating
    recentResiduals.push((r.power_w - expectedPowerW) / ratedWatts)
    recentThermalDeltas.push(temp - (25 + (irr / 800) * 20))
    if (r.voltage_v !== null && r.voltage_v > 0) {
      recentVoltages.push(r.voltage_v)
    }
  }

  // 2. Daily Efficiency & OLS Degradation Regression (Panel Degradation Model)
  const dailySeries = dailyGeneration.map(d => {
    const dayReads = readingsByDay.get(d.date) || []
    const activeDayReads = dayReads.filter(r => (r.irradiance_w_m2 ?? 0) >= 80)

    // Irradiance-normalized specific efficiency removes weather cloud variance
    let irrEfficiency = d.performance_ratio
    if (activeDayReads.length > 0) {
      const ratios = activeDayReads.map(r => {
        const expected = ratedWatts * ((r.irradiance_w_m2 ?? 1) / 1000)
        return expected > 10 ? r.power_w / expected : 1
      })
      irrEfficiency = mean(ratios)
    }

    const dayVoltages = activeDayReads
      .map(r => r.voltage_v)
      .filter((v): v is number => v !== null && v > 0)
    const vSpread = dayVoltages.length > 1 ? stdDev(dayVoltages) : 0
    const vMean = dayVoltages.length > 0 ? mean(dayVoltages) : 350
    const vOutOfBand = dayVoltages.filter(v => Math.abs(v - 350) > 18).length
    const vOutRatio = dayVoltages.length > 0 ? vOutOfBand / dayVoltages.length : 0
    const voltageStabilityPct = clamp(
      100 - (vSpread / Math.max(vMean, 1)) * 450 - vOutRatio * 55,
      10,
      100
    )

    return {
      date: d.date,
      irrEfficiency,
      pr: d.performance_ratio,
      voltageStabilityPct,
    }
  })

  const effSeries = dailySeries.map(d => d.irrEfficiency)
  const ewmaEff = computeEwma(effSeries, 0.45)
  const reg = linearRegression(effSeries)

  const slopePctPerDay = Number((reg.slope * 100).toFixed(2))
  const currentEff = effSeries.length > 0 ? effSeries[effSeries.length - 1] : 0.95
  const recentEwmaEff = ewmaEff.length > 0 ? ewmaEff[ewmaEff.length - 1] : 0.95
  const baselineEff = effSeries.length >= 3 ? Math.max(mean(effSeries.slice(0, 3)), 0.9) : 0.96
  const ewmaDropPct = Math.max(0, (baselineEff - recentEwmaEff) * 100)

  // Estimate days before efficiency crosses critical threshold (60% efficiency)
  const criticalThreshold = 0.6
  let estimatedDaysToCritical: number | null = null
  if (reg.slope < -0.005 && currentEff > criticalThreshold) {
    estimatedDaysToCritical = Math.max(
      1,
      Math.round((currentEff - criticalThreshold) / Math.abs(reg.slope))
    )
  } else if (currentEff <= criticalThreshold) {
    estimatedDaysToCritical = 1
  }

  // 3. Inverter Electrical Feature Extraction (Voltage MAD + Power Residual Loss + Thermal Stress)
  const nominalV = 350
  const vMed = recentVoltages.length > 0 ? median(recentVoltages) : nominalV
  const vMad = recentVoltages.length > 0 ? mad(recentVoltages) : 0
  const vStd = recentVoltages.length > 1 ? stdDev(recentVoltages) : 0
  const vCvPct = Number(((vStd / Math.max(vMed, 1)) * 100).toFixed(2))
  const vOutOfBandFraction =
    recentVoltages.length > 0
      ? recentVoltages.filter(v => Math.abs(v - nominalV) > 18).length / recentVoltages.length
      : 0

  // Robust Z-score for DC voltage drift / ripple (baseline MAD ~ 4.5V)
  const voltageDeviationZ = Math.max(
    Math.abs(vMed - nominalV) / 8.0,
    vMad / 4.5,
    vOutOfBandFraction * 5.5
  )

  const meanRecentResidual = recentResiduals.length > 0 ? mean(recentResiduals) : 0
  const residualLossPct = Number((Math.max(0, -meanRecentResidual) * 100).toFixed(1))
  // Baseline residual noise std ~ 0.04 (4% of rated capacity)
  const residualZ = Math.max(0, -meanRecentResidual / 0.045)

  const recentMeanThermalDelta = recentThermalDeltas.length > 0 ? mean(recentThermalDeltas) : 0
  const maxTemp = recentReadings.reduce((mx, r) => Math.max(mx, r.temperature_c ?? 0), 0)
  const thermalStressIndex = Number(
    clamp(recentMeanThermalDelta / 8 + Math.max(0, maxTemp - 58) / 10, 0, 5).toFixed(2)
  )

  // 4. Compute Composite ML Risk Scores (0 = healthy, 100 = high pre-failure risk)
  const slopeRisk = clamp((-slopePctPerDay - 0.35) * 14, 0, 65)
  const ewmaRisk = clamp((ewmaDropPct - 4) * 3.2, 0, 50)
  const residualPanelContribution = clamp((residualLossPct - 6) * 2.2, 0, 35)
  const panelRiskScore = clamp(
    Math.round(slopeRisk * 0.55 + ewmaRisk * 0.3 + residualPanelContribution * 0.35),
    2,
    96
  )

  const voltageRisk = clamp(voltageDeviationZ * 16, 0, 60)
  const mpptConversionRisk = clamp(residualZ * 14, 0, 45)
  const thermalRisk = clamp(thermalStressIndex * 11, 0, 35)
  const inverterRiskScore = clamp(
    Math.round(voltageRisk * 0.55 + mpptConversionRisk * 0.35 + thermalRisk * 0.25),
    2,
    96
  )

  const panelHealthScore = clamp(100 - panelRiskScore, 5, 99)
  const inverterHealthScore = clamp(100 - inverterRiskScore, 5, 99)
  const overallHealthScore = Math.round((panelHealthScore + inverterHealthScore) / 2)

  // Build daily health & anomaly chart series
  const dailyHealthSeries: MLAnomalyPoint[] = dailySeries.map((d, idx) => {
    const effPct = Number((clamp(d.irrEfficiency * 100, 0, 125)).toFixed(1))
    const expectedPct = Number(
      clamp((reg.intercept > 0 ? Math.max(reg.intercept, 0.94) : 0.95) * 100, 85, 105).toFixed(1)
    )
    const gap = Math.max(0, expectedPct - effPct)
    const vInstability = Math.max(0, 100 - d.voltageStabilityPct)
    const dayAnomaly = clamp(Math.round(gap * 2.4 + vInstability * 1.4 + (idx === dailySeries.length - 1 ? thermalStressIndex * 6 : 0)), 0, 100)

    return {
      date: d.date,
      efficiency_pct: effPct,
      expected_baseline_pct: expectedPct,
      anomaly_score: dayAnomaly,
      voltage_stability_pct: Number(d.voltageStabilityPct.toFixed(1)),
    }
  })

  // Feature Attribution Table
  const featureContributions: MLDiagnosticFeature[] = [
    {
      feature: 'OLS Degradation Slope',
      component: 'panel',
      value: `${slopePctPerDay >= 0 ? '+' : ''}${slopePctPerDay.toFixed(2)}%/day`,
      baseline: '0.00%/day (±0.4%)',
      z_score: Number((Math.max(0, -slopePctPerDay) / 0.65).toFixed(2)),
      status: slopePctPerDay <= -1.2 ? 'warning' : slopePctPerDay <= -0.5 ? 'watch' : 'normal',
    },
    {
      feature: 'EWMA Yield Drift',
      component: 'panel',
      value: `${ewmaDropPct > 0 ? '-' : ''}${ewmaDropPct.toFixed(1)}% vs baseline`,
      baseline: '< 5.0% drift',
      z_score: Number((ewmaDropPct / 4.5).toFixed(2)),
      status: ewmaDropPct >= 10 ? 'warning' : ewmaDropPct >= 5 ? 'watch' : 'normal',
    },
    {
      feature: 'Inverter DC Bus Stability',
      component: 'inverter',
      value: `${vCvPct.toFixed(2)}% CV (Med ${vMed.toFixed(0)}V)`,
      baseline: '350V ± 2.5% CV',
      z_score: Number(voltageDeviationZ.toFixed(2)),
      status: voltageDeviationZ >= 2.2 ? 'warning' : voltageDeviationZ >= 1.4 ? 'watch' : 'normal',
    },
    {
      feature: 'MPPT Irradiance-Power Residual',
      component: 'inverter',
      value: `${residualLossPct > 0 ? '-' : ''}${residualLossPct.toFixed(1)}% conversion gap`,
      baseline: '±4.5% expected variance',
      z_score: Number(residualZ.toFixed(2)),
      status: residualZ >= 2.0 ? 'warning' : residualZ >= 1.2 ? 'watch' : 'normal',
    },
    {
      feature: 'Thermal Stress Index',
      component: 'thermal',
      value: `${thermalStressIndex.toFixed(2)}σ (Peak ${maxTemp.toFixed(1)}°C)`,
      baseline: '< 1.20σ (< 58°C)',
      z_score: thermalStressIndex,
      status: thermalStressIndex >= 2.2 ? 'warning' : thermalStressIndex >= 1.3 ? 'watch' : 'normal',
    },
  ]

  // 5. Synthesize Early-Warning Predictive Alerts BEFORE critical failure
  const candidates: PredictiveAlertCandidate[] = []

  if (panelRiskScore >= 38 || slopePctPerDay <= -1.0 || ewmaDropPct >= 9.5) {
    const confidence = Number(clamp(sigmoid((panelRiskScore - 22) / 14), 0.62, 0.97).toFixed(2))
    const etaText =
      estimatedDaysToCritical !== null
        ? `At the current regression slope (${slopePctPerDay.toFixed(2)}%/day), output is projected to breach critical efficiency thresholds (<60%) in ~${estimatedDaysToCritical} days.`
        : `Irradiance-normalized yield has drifted ${ewmaDropPct.toFixed(1)}% below historical EWMA baseline.`

    candidates.push({
      category: 'ml_panel_degradation',
      component_target: 'panel',
      severity: 'warning',
      title: 'Predictive Alert: Early Panel Degradation Detected',
      message: `ML regression detected sustained irradiance-normalized efficiency loss before critical failure (${Math.round(confidence * 100)}% confidence). ${etaText}`,
      confidence,
      risk_score: panelRiskScore,
      predicted_days_to_critical: estimatedDaysToCritical,
      recommended_action:
        'Schedule a preventive string check for heavy soiling, shading, micro-cracks, or bypass diode wear before yield degrades further.',
      model_signals: [
        `OLS yield slope: ${slopePctPerDay.toFixed(2)}%/day (R² = ${reg.r2.toFixed(2)})`,
        `EWMA baseline drift: -${ewmaDropPct.toFixed(1)}%`,
        `Irradiance-power residual gap: -${residualLossPct.toFixed(1)}%`,
      ],
    })
  }

  if (inverterRiskScore >= 38 || voltageDeviationZ >= 2.1 || (residualZ >= 2.0 && vCvPct >= 3.2)) {
    const confidence = Number(clamp(sigmoid((inverterRiskScore - 20) / 13), 0.64, 0.96).toFixed(2))
    const predictedDays = Math.max(2, Math.round(clamp(22 - inverterRiskScore * 0.2, 3, 21)))
    candidates.push({
      category: 'ml_inverter_anomaly',
      component_target: 'inverter',
      severity: 'warning',
      title: 'Predictive Alert: Inverter & MPPT Instability Precursor',
      message: `Multivariate Z-score anomaly model flagged early inverter bus/MPPT drift (${Math.round(confidence * 100)}% confidence). DC bus instability (${vCvPct.toFixed(1)}% CV, median ${vMed.toFixed(0)}V) and conversion residual loss (-${residualLossPct.toFixed(1)}%) indicate potential inverter stress ~${predictedDays} days ahead of trip fault.`,
      confidence,
      risk_score: inverterRiskScore,
      predicted_days_to_critical: predictedDays,
      recommended_action:
        'Inspect inverter DC input terminals, MPPT tracking logs, and cooling airflow to prevent an unscheduled inverter shutdown.',
      model_signals: [
        `DC bus voltage Z-score: ${voltageDeviationZ.toFixed(2)}σ (${vCvPct.toFixed(1)}% CV)`,
        `MPPT power residual loss: -${residualLossPct.toFixed(1)}% (${residualZ.toFixed(2)}σ)`,
        `Thermal stress index: ${thermalStressIndex.toFixed(2)}σ`,
      ],
    })
  }

  if (thermalStressIndex >= 2.0 && inverterRiskScore < 38 && panelRiskScore < 38) {
    const confidence = Number(clamp(sigmoid((thermalStressIndex - 1.2) * 1.4), 0.6, 0.92).toFixed(2))
    candidates.push({
      category: 'ml_thermal_stress',
      component_target: 'thermal',
      severity: 'info',
      title: 'Predictive Alert: Elevated Thermal Derating Trend',
      message: `Cell temperature is trending ${recentMeanThermalDelta.toFixed(1)}°C above the expected NOCT irradiance curve (peak ${maxTemp.toFixed(1)}°C). Proactive thermal management can prevent accelerated panel & inverter aging.`,
      confidence,
      risk_score: Math.round(clamp(thermalStressIndex * 22, 25, 78)),
      predicted_days_to_critical: 14,
      recommended_action:
        'Check roof array airflow clearance, inverter heatsink dust accumulation, and ambient ventilation.',
      model_signals: [
        `Thermal stress index: ${thermalStressIndex.toFixed(2)}σ`,
        `Peak observed cell temp: ${maxTemp.toFixed(1)}°C`,
      ],
    })
  }

  return {
    report: {
      installation_id: installation.id,
      analyzed_at: new Date().toISOString(),
      readings_analyzed: sortedReadings.length,
      overall_health_score: overallHealthScore,
      panel_health_score: panelHealthScore,
      inverter_health_score: inverterHealthScore,
      panel_risk: classifyRisk(panelRiskScore),
      inverter_risk: classifyRisk(inverterRiskScore),
      degradation_slope_pct_per_day: slopePctPerDay,
      estimated_days_to_critical: estimatedDaysToCritical,
      inverter_voltage_instability_pct: vCvPct,
      inverter_residual_loss_pct: residualLossPct,
      thermal_stress_index: thermalStressIndex,
      feature_contributions: featureContributions,
      daily_health_series: dailyHealthSeries,
    },
    candidates,
  }
}

export function candidateToAlert(
  installationId: string,
  candidate: PredictiveAlertCandidate
): Alert {
  return {
    id: `ml-alert-${candidate.category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    installation_id: installationId,
    category: candidate.category,
    severity: candidate.severity,
    title: candidate.title,
    message: candidate.message,
    status: 'active',
    created_at: new Date().toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    source: 'ml_predictive',
    component_target: candidate.component_target,
    confidence: candidate.confidence,
    risk_score: candidate.risk_score,
    predicted_days_to_critical: candidate.predicted_days_to_critical,
    recommended_action: candidate.recommended_action,
    model_signals: candidate.model_signals,
  }
}
