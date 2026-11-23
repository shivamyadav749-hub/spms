import {
  CurrentWeatherData,
  DailyWeatherPoint,
  HourlySolarWeatherPoint,
  LocalWeatherReport,
  WeatherIconKind,
} from '../types'

interface OpenMeteoResponse {
  latitude: number
  longitude: number
  timezone: string
  timezone_abbreviation: string
  current?: {
    time: string
    temperature_2m?: number
    relative_humidity_2m?: number
    apparent_temperature?: number
    is_day?: number
    precipitation?: number
    weather_code?: number
    cloud_cover?: number
    wind_speed_10m?: number
    shortwave_radiation?: number
    direct_radiation?: number
    diffuse_radiation?: number
    direct_normal_irradiance?: number
  }
  hourly?: {
    time: string[]
    shortwave_radiation?: Array<number | null>
    cloud_cover?: Array<number | null>
    temperature_2m?: Array<number | null>
  }
  daily?: {
    time: string[]
    weather_code?: Array<number | null>
    temperature_2m_max?: Array<number | null>
    temperature_2m_min?: Array<number | null>
    sunrise?: string[]
    sunset?: string[]
    uv_index_max?: Array<number | null>
    shortwave_radiation_sum?: Array<number | null>
  }
}

export interface WeatherDescription {
  label: string
  icon: WeatherIconKind
}

export function describeWmoWeather(code: number, isDay = true): WeatherDescription {
  if (code === 0) {
    return { label: isDay ? 'Clear Sky' : 'Clear Night', icon: isDay ? 'sun' : 'moon' }
  }
  if (code === 1) {
    return { label: isDay ? 'Mainly Clear' : 'Mostly Clear', icon: isDay ? 'cloud-sun' : 'moon' }
  }
  if (code === 2) {
    return { label: 'Partly Cloudy', icon: isDay ? 'cloud-sun' : 'cloud' }
  }
  if (code === 3) {
    return { label: 'Overcast', icon: 'cloud' }
  }
  if (code === 45 || code === 48) {
    return { label: 'Foggy', icon: 'fog' }
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    if (code >= 51 && code <= 55) return { label: 'Light Drizzle', icon: 'rain' }
    if (code === 65 || code === 82) return { label: 'Heavy Rain', icon: 'rain' }
    return { label: 'Rainy', icon: 'rain' }
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { label: 'Snow', icon: 'snow' }
  }
  if (code >= 95 && code <= 99) {
    return { label: 'Thunderstorm', icon: 'storm' }
  }
  return { label: 'Variable Clouds', icon: 'cloud' }
}

export function getSolarIrradianceStatus(ghiWPerM2: number, isDay: boolean): {
  label: string
  variant: 'success' | 'info' | 'warning' | 'default'
} {
  if (!isDay || ghiWPerM2 <= 5) {
    return { label: 'Night / Minimal Light', variant: 'default' }
  }
  if (ghiWPerM2 >= 650) {
    return { label: 'Peak Solar Harvest', variant: 'success' }
  }
  if (ghiWPerM2 >= 300) {
    return { label: 'Good Solar Output', variant: 'info' }
  }
  return { label: 'Low Irradiance', variant: 'warning' }
}

export async function fetchLocalSolarWeather(
  latitude: number,
  longitude: number,
  locationLabel: string,
  sourceMode: 'installation' | 'geolocation' = 'installation',
  signal?: AbortSignal
): Promise<LocalWeatherReport> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'shortwave_radiation',
      'direct_radiation',
      'diffuse_radiation',
      'direct_normal_irradiance',
    ].join(','),
    hourly: ['shortwave_radiation', 'cloud_cover', 'temperature_2m'].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'shortwave_radiation_sum',
    ].join(','),
    past_days: '6',
    forecast_days: '1',
    timezone: 'auto',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`Weather API error (${response.status})`)
  }

  const raw: OpenMeteoResponse = await response.json()

  if (!raw.current) {
    throw new Error('Weather API returned incomplete telemetry')
  }

  const current: CurrentWeatherData = {
    time: raw.current.time,
    temperature_c: Number((raw.current.temperature_2m ?? 0).toFixed(1)),
    apparent_temperature_c: Number((raw.current.apparent_temperature ?? raw.current.temperature_2m ?? 0).toFixed(1)),
    relative_humidity_pct: Math.round(raw.current.relative_humidity_2m ?? 0),
    wind_speed_kmh: Number((raw.current.wind_speed_10m ?? 0).toFixed(1)),
    cloud_cover_pct: Math.round(raw.current.cloud_cover ?? 0),
    precipitation_mm: Number((raw.current.precipitation ?? 0).toFixed(2)),
    weather_code: raw.current.weather_code ?? 0,
    is_day: (raw.current.is_day ?? 1) === 1,
    shortwave_radiation_w_m2: Math.round(raw.current.shortwave_radiation ?? 0),
    direct_radiation_w_m2: Math.round(raw.current.direct_radiation ?? 0),
    diffuse_radiation_w_m2: Math.round(raw.current.diffuse_radiation ?? 0),
    direct_normal_irradiance_w_m2: Math.round(raw.current.direct_normal_irradiance ?? 0),
  }

  const daily: DailyWeatherPoint[] = (raw.daily?.time || []).map((date, idx) => {
    const mj = raw.daily?.shortwave_radiation_sum?.[idx] ?? 0
    return {
      date,
      weather_code: raw.daily?.weather_code?.[idx] ?? 0,
      temp_max_c: Number((raw.daily?.temperature_2m_max?.[idx] ?? 0).toFixed(1)),
      temp_min_c: Number((raw.daily?.temperature_2m_min?.[idx] ?? 0).toFixed(1)),
      uv_index_max: Number((raw.daily?.uv_index_max?.[idx] ?? 0).toFixed(1)),
      solar_radiation_mj_m2: Number(mj.toFixed(2)),
      // Convert MJ/m^2 to kWh/m^2 (1 kWh = 3.6 MJ)
      solar_insolation_kwh_m2: Number((mj / 3.6).toFixed(2)),
      sunrise: raw.daily?.sunrise?.[idx] ?? '',
      sunset: raw.daily?.sunset?.[idx] ?? '',
    }
  })

  const localDateStr = current.time.slice(0, 10)
  const todayHourly: HourlySolarWeatherPoint[] = []

  if (raw.hourly?.time) {
    for (let i = 0; i < raw.hourly.time.length; i++) {
      const timeStr = raw.hourly.time[i]
      if (!timeStr.startsWith(localDateStr)) continue
      const hourPart = timeStr.slice(11, 16)
      todayHourly.push({
        time: timeStr,
        hour_label: hourPart,
        irradiance_w_m2: Math.round(raw.hourly.shortwave_radiation?.[i] ?? 0),
        cloud_cover_pct: Math.round(raw.hourly.cloud_cover?.[i] ?? 0),
        temperature_c: Number((raw.hourly.temperature_2m?.[i] ?? 0).toFixed(1)),
      })
    }
  }

  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    timezone_abbreviation: raw.timezone_abbreviation,
    location_label: locationLabel,
    source_mode: sourceMode,
    fetched_at: new Date().toISOString(),
    current,
    daily,
    today_hourly: todayHourly,
  }
}
