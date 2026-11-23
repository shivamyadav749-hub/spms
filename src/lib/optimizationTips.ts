import {
  DashboardData,
  Installation,
  LocalWeatherReport,
  MLPredictiveReport,
} from '../types'

export type OptimizationCategory =
  | 'load_shifting'
  | 'cleaning'
  | 'thermal'
  | 'inverter'
  | 'performance'

export interface OptimizationTip {
  id: string
  category: OptimizationCategory
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimated_impact: string
  basis: string
  action_label?: string
  action_to?: string
}

export function generateOptimizationTips(params: {
  installation: Installation | null
  dashboard: DashboardData | null
  weather: LocalWeatherReport | null
  mlReport: MLPredictiveReport | null
}): OptimizationTip[] {
  const { installation, dashboard, weather, mlReport } = params
  const tips: OptimizationTip[] = []

  if (!dashboard) return tips

  const m = dashboard.metrics
  const comp = dashboard.comparison
  const daily = dashboard.daily_generation
  const ratedKw = installation?.capacity_kw ?? 5.0

  // 1. Weather-aware Peak Solar Window Load Shifting
  if (weather) {
    const hourly = weather.today_hourly
    const current = weather.current
    const todayWx = weather.daily[weather.daily.length - 1]

    // Find peak irradiance window (>= 70% of today's max irradiance)
    const maxIrr = hourly.reduce((mx, h) => Math.max(mx, h.irradiance_w_m2), 0)
    const peakHours = hourly.filter(h => maxIrr >= 120 && h.irradiance_w_m2 >= maxIrr * 0.7)

    if (peakHours.length > 0 && todayWx) {
      const startHour = peakHours[0].hour_label
      const endHour = peakHours[peakHours.length - 1].hour_label
      const peakPowerEstKw = Number(((ratedKw * maxIrr) / 1000 * 0.85).toFixed(1))

      tips.push({
        id: 'tip-peak-window',
        category: 'load_shifting',
        priority: current.cloud_cover_pct <= 40 ? 'high' : 'medium',
        title: `Shift Heavy Loads to Peak Window (${startHour}–${endHour})`,
        description: `Today's solar forecast at ${weather.location_label} peaks at ${maxIrr} W/m² (${todayWx.solar_insolation_kwh_m2.toFixed(1)} kWh/m² daily insolation), yielding up to ~${peakPowerEstKw} kW AC. Running EV charging, water heating, or laundry during ${startHour}–${endHour} maximizes direct solar self-consumption.`,
        estimated_impact: `~${peakPowerEstKw} kW peak capture`,
        basis: 'Live Hourly Irradiance Forecast',
      })
    } else if (current.is_day && current.cloud_cover_pct >= 65) {
      tips.push({
        id: 'tip-cloudy-dispatch',
        category: 'load_shifting',
        priority: 'medium',
        title: 'Stagger High-Draw Appliances Under Heavy Cloud Cover',
        description: `Cloud cover is currently ${current.cloud_cover_pct}% with diffuse irradiance at ${current.diffuse_radiation_w_m2} W/m² (GHI ${current.shortwave_radiation_w_m2} W/m²). Stagger large appliance cycles sequentially rather than overlapping them to avoid drawing grid peak power.`,
        estimated_impact: 'Reduce grid import spikes',
        basis: `Live Sky Telemetry (${current.cloud_cover_pct}% clouds)`,
      })
    }

    // 2. Ambient Temperature & Thermal Derating Tip
    const panelTemp = m.panel_temperature_c
    if ((panelTemp !== null && panelTemp >= 52) || (mlReport && mlReport.thermal_stress_index >= 1.3)) {
      const tempVal = panelTemp ?? current.temperature_c
      const deratingLoss = panelTemp !== null && panelTemp > 25 ? ((panelTemp - 25) * 0.4).toFixed(1) : '8.0'
      tips.push({
        id: 'tip-thermal-cooling',
        category: 'thermal',
        priority: panelTemp !== null && panelTemp >= 62 ? 'high' : 'medium',
        title: 'Mitigate Thermal Efficiency Loss with Airflow Clearance',
        description: `Cell temperature reached ${tempVal.toFixed(1)}°C with ${current.wind_speed_kmh} km/h local wind speed, causing roughly ${deratingLoss}% thermal output derating. Clear debris beneath the array and verify inverter fan vents are unobstructed.`,
        estimated_impact: `Recover +2–4% peak output`,
        basis: 'Panel Temp + Local Wind Telemetry',
        action_label: 'Check Alerts',
        action_to: '/alerts',
      })
    } else if (current.temperature_c <= 14 && todayWx && todayWx.solar_insolation_kwh_m2 >= 2.2) {
      tips.push({
        id: 'tip-cold-weather-efficiency',
        category: 'thermal',
        priority: 'low',
        title: 'Capitalize on Cool Ambient Cell Efficiency',
        description: `Cool ambient air (${current.temperature_c}°C, wind ${current.wind_speed_kmh} km/h) keeps solar cell temperatures low, improving open-circuit voltage and conversion efficiency relative to hot summer afternoons.`,
        estimated_impact: '+3–5% thermal voltage bonus',
        basis: 'Ambient Temp + Irradiance',
      })
    }

    // 3. Dry-Spell Soiling vs Rain Wash-Off Check
    const recentRainDays = weather.daily.filter(d => d.weather_code >= 51).length
    if (recentRainDays === 0 && m.performance_ratio < 0.9) {
      const avgInsolation =
        weather.daily.reduce((s, d) => s + d.solar_insolation_kwh_m2, 0) /
        Math.max(weather.daily.length, 1)
      tips.push({
        id: 'tip-panel-cleaning',
        category: 'cleaning',
        priority: m.performance_ratio < 0.8 ? 'high' : 'medium',
        title: 'Schedule Early-Morning Panel Rinse After Dry Week',
        description: `No rainfall has been recorded over the past 7 days (avg ${avgInsolation.toFixed(1)} kWh/m²/day insolation) while your system Performance Ratio sits at ${(m.performance_ratio * 100).toFixed(0)}%. Removing surface dust early morning before panels heat up can restore lost irradiance absorption.`,
        estimated_impact: '+4–8% daily kWh',
        basis: '7-Day Dry Weather + PR Ratio',
      })
    } else if (recentRainDays > 0 && m.performance_ratio >= 0.9) {
      tips.push({
        id: 'tip-post-rain-baseline',
        category: 'cleaning',
        priority: 'low',
        title: 'Natural Rain Wash Keeping Array Yield Clean',
        description: `Recent precipitation (${recentRainDays} wet day${recentRainDays > 1 ? 's' : ''} in the past week) has helped keep panel glass clear, supporting a ${(m.performance_ratio * 100).toFixed(0)}% Performance Ratio.`,
        estimated_impact: 'Optimal surface clarity',
        basis: '7-Day Weather + PR Ratio',
      })
    }
  }

  // 4. Historical Performance & ML Diagnostics Tips
  if (mlReport && (mlReport.inverter_risk !== 'low' || mlReport.inverter_residual_loss_pct >= 7.5)) {
    tips.push({
      id: 'tip-inverter-tuning',
      category: 'inverter',
      priority: 'high',
      title: 'Inspect Inverter DC Bus & MPPT Conversion Efficiency',
      description: `ML telemetry diagnostics flagged ${mlReport.inverter_voltage_instability_pct.toFixed(1)}% DC bus voltage variation and a -${mlReport.inverter_residual_loss_pct.toFixed(1)}% MPPT conversion residual gap (Inverter Health: ${mlReport.inverter_health_score}%). Tightening DC isolators and reviewing MPPT logs can reclaim lost conversion headroom.`,
      estimated_impact: `Recover ~${Math.max(3, Math.round(mlReport.inverter_residual_loss_pct))}% AC yield`,
      basis: 'ML Inverter Anomaly Diagnostics',
      action_label: 'Inspect ML Alerts',
      action_to: '/alerts',
    })
  }

  if (mlReport && (mlReport.panel_risk !== 'low' || mlReport.degradation_slope_pct_per_day <= -0.6)) {
    tips.push({
      id: 'tip-degradation-mitigation',
      category: 'performance',
      priority: 'high',
      title: 'Address Downward Array Yield Trend Early',
      description: `Historical 7-day regression shows a ${mlReport.degradation_slope_pct_per_day.toFixed(2)}%/day efficiency slope. Check for new afternoon tree/chimney shading, inspect string fuses, or book a preventive diagnostic before yield falls further.`,
      estimated_impact: 'Prevent progressive loss',
      basis: '7-Day OLS Efficiency Trend',
      action_label: 'Find Technician',
      action_to: '/technicians',
    })
  } else if (comp.difference_percent < -6 && daily.length > 0) {
    const lowestDay = [...daily].sort((a, b) => a.performance_ratio - b.performance_ratio)[0]
    const recoverKwh = Math.max(0.5, Math.abs(comp.difference_kwh) / Math.max(daily.length, 1))
    tips.push({
      id: 'tip-historical-gap',
      category: 'performance',
      priority: 'medium',
      title: 'Review Underperforming Interval Against Model Baseline',
      description: `Over the ${comp.period}, actual generation trailed expected output by ${Math.abs(comp.difference_kwh).toFixed(1)} kWh (${comp.difference_percent.toFixed(1)}%), with the lowest efficiency on ${new Date(lowestDay.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} (${(lowestDay.performance_ratio * 100).toFixed(0)}% PR). Export the detailed breakdown to compare irradiance vs. output.`,
      estimated_impact: `+${recoverKwh.toFixed(1)} kWh/day potential`,
      basis: 'Historical 7-Day Variance',
      action_label: 'Open Analytics',
      action_to: '/analytics',
    })
  } else if (comp.difference_percent >= 2) {
    tips.push({
      id: 'tip-high-performer',
      category: 'performance',
      priority: 'low',
      title: 'System Outperforming Historical Expected Baseline',
      description: `Your ${ratedKw} kW array produced +${comp.difference_kwh.toFixed(1)} kWh (+${comp.difference_percent.toFixed(1)}%) above the expected model over the ${comp.period}. Maintain current cleaning intervals and export reports from Analytics for long-term warranty tracking.`,
      estimated_impact: `+${comp.difference_kwh.toFixed(1)} kWh surplus`,
      basis: 'Historical 7-Day Variance',
      action_label: 'Export Report',
      action_to: '/analytics',
    })
  }

  // Ensure at least 3 high-value tips even if weather hasn't loaded yet
  if (tips.length === 0) {
    tips.push({
      id: 'tip-baseline-monitoring',
      category: 'performance',
      priority: 'low',
      title: 'Track Daytime Self-Consumption Against Solar Peak',
      description: `Your installation is generating ${m.energy_today_kwh.toFixed(1)} kWh today (${(m.performance_ratio * 100).toFixed(0)}% Performance Ratio). Aligning discretionary appliance usage with midday generation windows improves solar return on investment.`,
      estimated_impact: 'Higher self-consumption',
      basis: 'Historical System Performance',
      action_label: 'View Analytics',
      action_to: '/analytics',
    })
  }

  const order: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 }
  return tips.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 4)
}
