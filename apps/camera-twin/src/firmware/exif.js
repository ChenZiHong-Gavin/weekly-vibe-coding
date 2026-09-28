// Read the shooting settings out of a real photo (JPEG/HEIF/RAW-embedded EXIF) with exifr, normalised to the twin's vocabulary.
import exifr from 'exifr';

// exifr may return raw numbers or translated strings depending on the build; accept both.
const PROGRAM = { 1: 'M', 2: 'P', 3: 'Av', 4: 'Tv', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 'Manual': 'M', 'Normal program': 'P', 'Aperture priority': 'Av', 'Shutter priority': 'Tv', 'Creative program': 'P', 'Action program': 'P', 'Portrait mode': 'P', 'Landscape mode': 'P', 'Not defined': 'A+' };
const METERING = { 1: '平均', 2: '中央重点平均测光', 3: '点测光', 4: '多点', 5: '评价测光', 6: '局部测光', 'Average': '平均', 'CenterWeightedAverage': '中央重点平均测光', 'Spot': '点测光', 'MultiSpot': '多点', 'Pattern': '评价测光', 'Partial': '局部测光' };

export async function readShootingInfo(file) {
  const x = await exifr.parse(file, { tiff: true, exif: true, ifd0: true, makerNote: false, xmp: false, icc: false, iptc: false, gps: false });
  if (!x) throw new Error('这张图片里没有 EXIF 拍摄信息（可能被社交软件压缩过）');
  const program = PROGRAM[x.ExposureProgram] || ((x.ExposureMode === 1 || x.ExposureMode === 'Manual') ? 'M' : 'P');
  return {
    model: x.Model || '', lens: x.LensModel || '', date: x.DateTimeOriginal ? new Date(x.DateTimeOriginal).toLocaleString('zh-CN') : '',
    program, exposureTime: typeof x.ExposureTime === 'number' ? x.ExposureTime : null, fnumber: typeof x.FNumber === 'number' ? +x.FNumber.toFixed(1) : null,
    iso: typeof x.ISO === 'number' ? x.ISO : null, ec: typeof x.ExposureCompensation === 'number' ? +x.ExposureCompensation.toFixed(2) : 0,
    metering: METERING[x.MeteringMode] || '', focalLength: x.FocalLength || null, flash: x.Flash, whiteBalance: (x.WhiteBalance === 1 || x.WhiteBalance === 'Manual') ? '手动' : '自动',
    width: x.ExifImageWidth || x.ImageWidth || null, height: x.ExifImageHeight || x.ImageHeight || null
  };
}

export function fmtShutter(t) { if (!t) return '—'; return t >= 1 ? `${t}"` : `1/${Math.round(1 / t)}`; }
export function summary(info) {
  return `${info.model || '未知机身'}${info.lens ? ' · ' + info.lens : ''}｜${info.program} · ${fmtShutter(info.exposureTime)} · F${info.fnumber ?? '—'} · ISO ${info.iso ?? '—'} · 曝光补偿 ${info.ec > 0 ? '+' : ''}${info.ec}${info.metering ? ' · ' + info.metering : ''}${info.focalLength ? ' · ' + info.focalLength + 'mm' : ''}`;
}
