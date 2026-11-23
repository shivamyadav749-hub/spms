import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DashboardData, Installation } from '../types'

function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // Guard against spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(sanitizeCsvCell).join(',')
}

function formatDateSlug(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

export function exportPerformanceCSV(
  data: DashboardData,
  installation?: Installation
): string {
  const spmsId = installation?.spms_id || 'SPMS'
  const filename = `spms-performance-report-${spmsId.toLowerCase()}-${formatDateSlug()}.csv`
  const m = data.metrics
  const comp = data.comparison

  const lines: string[] = []

  // Section 1: Report Metadata
  lines.push(buildCsvRow(['SPMS - Energy Performance Report']))
  lines.push(buildCsvRow(['Generated At', new Date().toLocaleString()]))
  lines.push(buildCsvRow(['Installation Name', installation?.name || 'Solar Installation']))
  lines.push(buildCsvRow(['SPMS ID', spmsId]))
  if (installation) {
    lines.push(
      buildCsvRow([
        'Location',
        [installation.address, installation.city, installation.postal_code].filter(Boolean).join(', '),
      ])
    )
    lines.push(buildCsvRow(['Rated Capacity (kW)', installation.capacity_kw]))
  }
  lines.push(buildCsvRow(['Data Source', m.data_source === 'simulated' ? 'Simulated Model Data' : 'Live Inverter Hardware']))
  lines.push(buildCsvRow(['Evaluated Period', comp.period]))
  lines.push('')

  // Section 2: Key Telemetry Metrics
  lines.push(buildCsvRow(['Summary Telemetry Metrics']))
  lines.push(buildCsvRow(['Metric', 'Value', 'Unit']))
  lines.push(buildCsvRow(['Current Power', m.current_power_w, 'W']))
  lines.push(buildCsvRow(['Energy Today', m.energy_today_kwh, 'kWh']))
  lines.push(buildCsvRow(['Energy This Month', m.energy_this_month_kwh, 'kWh']))
  lines.push(buildCsvRow(['Panel Temperature', m.panel_temperature_c ?? 'N/A', m.panel_temperature_c !== null ? '°C' : '']))
  lines.push(buildCsvRow(['Performance Ratio', (m.performance_ratio * 100).toFixed(1), '%']))
  lines.push(buildCsvRow(['Active Alerts', m.active_alerts, 'count']))
  lines.push('')

  // Section 3: Period Comparison
  lines.push(buildCsvRow(['Expected vs Actual Comparison']))
  lines.push(buildCsvRow(['Actual Total (kWh)', 'Expected Total (kWh)', 'Difference (kWh)', 'Variance (%)', 'Status']))
  lines.push(
    buildCsvRow([
      comp.actual_kwh.toFixed(2),
      comp.expected_kwh.toFixed(2),
      comp.difference_kwh.toFixed(2),
      `${comp.difference_percent.toFixed(1)}%`,
      formatStatusLabel(comp.status),
    ])
  )
  lines.push('')

  // Section 4: Daily Generation Breakdown
  lines.push(buildCsvRow(['Daily Generation Breakdown']))
  lines.push(buildCsvRow(['Date', 'Actual Energy (kWh)', 'Expected Energy (kWh)', 'Variance (kWh)', 'Performance Ratio (%)']))
  for (const day of data.daily_generation) {
    const variance = day.energy_kwh - day.expected_kwh
    lines.push(
      buildCsvRow([
        day.date,
        day.energy_kwh.toFixed(2),
        day.expected_kwh.toFixed(2),
        variance.toFixed(2),
        (day.performance_ratio * 100).toFixed(1),
      ])
    )
  }

  // Section 5: Weekly Summary
  if (data.weekly_generation.length > 0) {
    lines.push('')
    lines.push(buildCsvRow(['Weekly Generation Summary']))
    lines.push(buildCsvRow(['Week Starting', 'Actual Energy (kWh)', 'Expected Energy (kWh)', 'Performance Ratio (%)']))
    for (const wk of data.weekly_generation) {
      lines.push(
        buildCsvRow([
          wk.date,
          wk.energy_kwh.toFixed(2),
          wk.expected_kwh.toFixed(2),
          (wk.performance_ratio * 100).toFixed(1),
        ])
      )
    }
  }

  // Section 6: Monthly Summary
  if (data.monthly_generation.length > 0) {
    lines.push('')
    lines.push(buildCsvRow(['Monthly Generation Summary']))
    lines.push(buildCsvRow(['Month', 'Actual Energy (kWh)', 'Expected Energy (kWh)', 'Performance Ratio (%)']))
    for (const mo of data.monthly_generation) {
      lines.push(
        buildCsvRow([
          mo.month,
          mo.energy_kwh.toFixed(2),
          mo.expected_kwh.toFixed(2),
          (mo.performance_ratio * 100).toFixed(1),
        ])
      )
    }
  }

  // UTF-8 BOM helps Excel open special characters like °C cleanly
  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return filename
}

export function exportPerformancePDF(
  data: DashboardData,
  installation?: Installation
): string {
  const spmsId = installation?.spms_id || 'SPMS'
  const filename = `spms-performance-report-${spmsId.toLowerCase()}-${formatDateSlug()}.pdf`
  const m = data.metrics
  const comp = data.comparison

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Branded Header Banner
  doc.setFillColor(22, 163, 74) // solar-600
  doc.rect(0, 0, pageWidth, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('SPMS — Energy Performance Report', 14, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `${installation?.name || 'Solar Installation'} (${spmsId}) • Generated ${new Date().toLocaleString()}`,
    14,
    22
  )

  // Installation Metadata Box
  let cursorY = 38
  doc.setTextColor(31, 41, 55)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Installation Overview', 14, cursorY)

  cursorY += 4
  const locationText = installation
    ? [installation.address, installation.city, installation.postal_code].filter(Boolean).join(', ')
    : 'N/A'

  autoTable(doc, {
    startY: cursorY,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' },
    body: [
      [
        'Installation Name',
        installation?.name || 'Solar Installation',
        'SPMS Identifier',
        spmsId,
      ],
      [
        'Location',
        locationText || 'N/A',
        'Rated Capacity',
        installation ? `${installation.capacity_kw} kW` : 'N/A',
      ],
      [
        'Data Source',
        m.data_source === 'simulated' ? 'Simulated Model Data (Demo Mode)' : 'Live Inverter Hardware',
        'Evaluated Period',
        formatStatusLabel(comp.period),
      ],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [249, 250, 251], cellWidth: 36 },
      1: { cellWidth: 56 },
      2: { fontStyle: 'bold', fillColor: [249, 250, 251], cellWidth: 36 },
      3: { cellWidth: 54 },
    },
  })

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 25) + 8

  // Key Telemetry & Variance Summary
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Performance Summary & Variance', 14, cursorY)
  cursorY += 4

  autoTable(doc, {
    startY: cursorY,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Key Telemetry Metric', 'Value', 'Period Comparison', 'Value']],
    body: [
      [
        'Current Power Output',
        `${m.current_power_w.toLocaleString(undefined, { maximumFractionDigits: 1 })} W`,
        'Actual Period Total',
        `${comp.actual_kwh.toFixed(2)} kWh`,
      ],
      [
        'Energy Today',
        `${m.energy_today_kwh.toFixed(1)} kWh`,
        'Expected Model Total',
        `${comp.expected_kwh.toFixed(2)} kWh`,
      ],
      [
        'Energy This Month',
        `${m.energy_this_month_kwh.toFixed(1)} kWh`,
        'Net Variance',
        `${comp.difference_kwh >= 0 ? '+' : ''}${comp.difference_kwh.toFixed(2)} kWh (${comp.difference_percent >= 0 ? '+' : ''}${comp.difference_percent.toFixed(1)}%)`,
      ],
      [
        'Overall Performance Ratio',
        `${(m.performance_ratio * 100).toFixed(1)}%`,
        'Evaluation Status',
        formatStatusLabel(comp.status),
      ],
      [
        'Panel Temperature',
        m.panel_temperature_c !== null ? `${m.panel_temperature_c.toFixed(1)} °C` : 'N/A',
        'Active System Alerts',
        String(m.active_alerts),
      ],
    ],
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { fontStyle: 'bold' },
    },
  })

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 40) + 8

  // Daily Energy Generation Table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Daily Energy Generation Breakdown', 14, cursorY)
  cursorY += 4

  autoTable(doc, {
    startY: cursorY,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Date', 'Actual (kWh)', 'Expected (kWh)', 'Variance (kWh)', 'Performance Ratio']],
    body: data.daily_generation.map(day => {
      const variance = day.energy_kwh - day.expected_kwh
      return [
        day.date,
        day.energy_kwh.toFixed(2),
        day.expected_kwh.toFixed(2),
        `${variance >= 0 ? '+' : ''}${variance.toFixed(2)}`,
        `${(day.performance_ratio * 100).toFixed(1)}%`,
      ]
    }),
  })

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 40) + 8

  // Weekly / Monthly Summary if space & data exist
  if (data.monthly_generation.length > 0) {
    if (cursorY > pageHeight - 50) {
      doc.addPage()
      cursorY = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Monthly Generation Summary', 14, cursorY)
    cursorY += 4

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['Month', 'Actual (kWh)', 'Expected (kWh)', 'Performance Ratio']],
      body: data.monthly_generation.map(mo => [
        mo.month,
        mo.energy_kwh.toFixed(2),
        mo.expected_kwh.toFixed(2),
        `${(mo.performance_ratio * 100).toFixed(1)}%`,
      ]),
    })
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text(
      'SPMS Solar Performance Monitoring System — Automated Telemetry Report',
      14,
      pageHeight - 10
    )
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
  }

  doc.save(filename)
  return filename
}
