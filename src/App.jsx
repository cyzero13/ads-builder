import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { starterReference } from './templates/starterReference'
import './App.css'

const starterTemplates = [starterReference]
const END_SCENE_ID = 'end-scene'

const defaultAudioSettings = {
  backgroundMusic: '',
  backgroundVolume: 0.55,
  backgroundLoop: true,
}

const cloneAudioSettings = (audio = {}) => ({
  ...defaultAudioSettings,
  ...(audio ?? {}),
})

const devicePresets = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667 },
  { id: 'iphone-xr', name: 'iPhone XR', width: 414, height: 896 },
  { id: 'iphone-12-pro', name: 'iPhone 12 Pro', width: 390, height: 844 },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915 },
  { id: 'galaxy-s8-plus', name: 'Samsung Galaxy S8+', width: 360, height: 740 },
  { id: 'galaxy-s20-ultra', name: 'Samsung Galaxy S20 Ultra', width: 412, height: 915 },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024 },
  { id: 'ipad-air', name: 'iPad Air', width: 820, height: 1180 },
  { id: 'ipad-pro', name: 'iPad Pro', width: 1024, height: 1366 },
  { id: 'surface-pro-7', name: 'Surface Pro 7', width: 912, height: 1368 },
  { id: 'surface-duo', name: 'Surface Duo', width: 540, height: 720 },
  { id: 'galaxy-z-fold-5', name: 'Galaxy Z Fold 5', width: 344, height: 882 },
  { id: 'asus-zenbook-fold', name: 'Asus Zenbook Fold', width: 853, height: 1280 },
  { id: 'galaxy-a51-a71', name: 'Samsung Galaxy A51/71', width: 412, height: 914 },
  { id: 'nest-hub', name: 'Nest Hub', width: 1024, height: 600 },
  { id: 'nest-hub-max', name: 'Nest Hub Max', width: 1280, height: 800 },
]

const cloneTemplate = (templateId, sourceTemplates = starterTemplates) => {
  const template = sourceTemplates.find((item) => item.id === templateId) ?? sourceTemplates[0]
  const defaults = JSON.parse(JSON.stringify(template.defaults))
  return {
    ...defaults,
    audio: cloneAudioSettings(defaults.audio),
  }
}

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings))

const applyBackgroundToSettings = (targetSettings, background) => ({
  ...targetSettings,
  background: cloneSettings(background),
})

const defaultEndScene = {
  enabled: false,
  name: 'End Scene',
  html: '',
  src: '',
  clickUrl: '',
  showOnLoad: false,
  delaySeconds: 0.95,
  animation: 'slide-right',
}

const endSceneAnimationOptions = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-right', label: 'Show from right' },
  { value: 'slide-left', label: 'Show from left' },
  { value: 'slide-up', label: 'Show from bottom' },
  { value: 'slide-down', label: 'Show from top' },
  { value: 'zoom', label: 'Zoom' },
]

const elementEntranceAnimationOptions = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-up', label: 'Show from bottom' },
  { value: 'slide-down', label: 'Show from top' },
  { value: 'slide-left', label: 'Show from right' },
  { value: 'slide-right', label: 'Show from left' },
  { value: 'zoom', label: 'Zoom' },
]

const cloneEndScene = (endScene = defaultEndScene) => ({
  ...defaultEndScene,
  ...endScene,
})

const getSceneDelaySeconds = (scene, fallback = 0) =>
  Math.max(0, Number(scene?.showAfterSeconds ?? fallback) || 0)

const getSceneAutoShowNext = (scene) => Boolean(scene?.autoShowNext)

const getFirstSceneId = (scenes) =>
  scenes.find((scene) => scene.startScene)?.id ?? scenes[0]?.id ?? null

const normalizeSceneMeta = (scene, index) => ({
  startScene: scene.startScene ?? index === 0,
  autoShowNext: getSceneAutoShowNext(scene),
  showAfterSeconds: getSceneDelaySeconds(scene, 0),
  sceneChangeSfx: scene.sceneChangeSfx ?? '',
  sceneChangeVolume: Math.min(Math.max(Number(scene.sceneChangeVolume ?? 1) || 0, 0), 1),
})

const getElementDelaySeconds = (element) =>
  Math.max(0, Number(element?.showAfterSeconds ?? 0) || 0)

const orientSize = (device, orientation) => {
  const minSide = Math.min(device.width, device.height)
  const maxSide = Math.max(device.width, device.height)

  return orientation === 'landscape'
    ? { width: maxSide, height: minSide }
    : { width: minSide, height: maxSide }
}

const getScaleOffsetY = (viewportHeight, scaledHeight, position) => {
  if (position === 'top') return 0
  if (position === 'bottom') return viewportHeight - scaledHeight
  return (viewportHeight - scaledHeight) / 2
}

const getCenterSnap = (value, size, containerSize, threshold = 14) => {
  const centered = (containerSize - size) / 2
  const snapped = Math.abs(value - centered) <= threshold
  return {
    value: snapped ? centered : value,
    snapped,
  }
}

const getVerticalSnap = (value, size, containerSize, threshold = 14) => {
  const bottom = containerSize - size
  if (Math.abs(value - bottom) <= threshold) {
    return {
      value: bottom,
      snapped: true,
    }
  }

  return getCenterSnap(value, size, containerSize, threshold)
}

const getContainerSnap = (value, size, containerSize, threshold = 14) => {
  const edges = [0, (containerSize - size) / 2, containerSize - size]
  const snapValue = edges.find((edge) => Math.abs(value - edge) <= threshold)

  return {
    value: snapValue ?? value,
    snapped: snapValue !== undefined,
  }
}

const getElements = (settings) => settings.elements ?? []

const getElementLayer = (element) => (element?.layer === 'overlay' ? 'overlay' : 'scene')

const getLayerElements = (settings, layer) =>
  getElements(settings).filter((element) => getElementLayer(element) === layer)

const getAlignmentBoxLines = (box) => ({
  x: [box.x, box.x + box.width / 2, box.x + box.width],
  y: [box.y, box.y + box.height / 2, box.y + box.height],
})

const getAlignmentBoxes = (settings, excludeId) => {
  const canvasWidth = settings.canvas.width
  const canvasHeight = settings.canvas.height
  const boxes = getElements(settings)
    .filter((element) => element.id !== excludeId)
    .map((element) => ({
      id: element.id,
      x: element.fullWidth ? 0 : element.x,
      y: element.fixedBottom ? canvasHeight - element.height : element.y,
      width: element.fullWidth ? canvasWidth : element.width,
      height: element.height,
    }))

  return boxes
}

const findAlignmentGuides = (movingBox, targetBoxes, threshold = 3) => {
  const movingLines = getAlignmentBoxLines(movingBox)
  const guides = { x: [], y: [] }

  targetBoxes.forEach((box) => {
    const targetLines = getAlignmentBoxLines(box)

    movingLines.x.forEach((line) => {
      targetLines.x.forEach((targetLine) => {
        if (Math.abs(line - targetLine) <= threshold) {
          guides.x.push(Math.round(targetLine))
        }
      })
    })

    movingLines.y.forEach((line) => {
      targetLines.y.forEach((targetLine) => {
        if (Math.abs(line - targetLine) <= threshold) {
          guides.y.push(Math.round(targetLine))
        }
      })
    })
  })

  return {
    x: [...new Set(guides.x)].slice(0, 4),
    y: [...new Set(guides.y)].slice(0, 4),
  }
}

const getFirstElementId = (settings) => getElements(settings)[0]?.id ?? null

const upsertElementInSettings = (settings, nextElement) => {
  const elements = getElements(settings)
  const hasElement = elements.some((element) => element.id === nextElement.id)

  return {
    ...settings,
    elements: hasElement
      ? elements.map((element) => (element.id === nextElement.id ? cloneSettings(nextElement) : element))
      : [...elements, cloneSettings(nextElement)],
  }
}

const removeElementFromSettings = (settings, elementId) => ({
  ...settings,
  elements: getElements(settings).filter((element) => element.id !== elementId),
})

const getAllSceneElements = (scenes) =>
  scenes.flatMap((scene) => getElements(scene.settings))

const getSharedSceneElements = (scenes, currentSettings) => {
  const sharedById = new Map()

  getAllSceneElements(scenes)
    .concat(getElements(currentSettings))
    .forEach((element) => {
      if (element.applyToAllScenes) {
        sharedById.set(element.id, cloneSettings(element))
      }
    })

  return [...sharedById.values()]
}

const applySharedElementsToSettings = (settings, sharedElements) =>
  sharedElements.reduce(upsertElementInSettings, settings)

const getElementRole = (element) => {
  if (!element) return 'regular'

  if (element.role === 'cta') return element.role
  return 'regular'
}

function IconMark({ children }) {
  return (
    <span className="button-icon" aria-hidden="true">
      {children}
    </span>
  )
}

const elementTypes = [
  { value: 'div', label: 'Div' },
  { value: 'text', label: 'Text' },
  { value: 'button', label: 'Button' },
  { value: 'hotspot', label: 'Click area' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
]

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max)

const getDefaultElementLayout = (type, canvas) => {
  const scale = Math.min(canvas.width / 1080, canvas.height / 1920)

  const layouts = {
    text: { width: 620, height: 96, radius: 0, size: 56 },
    button: { width: 560, height: 132, radius: 28, size: 48 },
    hotspot: { width: 420, height: 280, radius: 16, size: 32 },
    image: { width: 560, height: 380, radius: 0, size: 44 },
    video: { width: 560, height: 380, radius: 0, size: 44 },
    div: { width: 460, height: 180, radius: 18, size: 48 },
  }
  const layout = layouts[type] ?? layouts.div
  const width = Math.round(clampNumber(layout.width * scale, 180, canvas.width * 0.82))
  const height = Math.round(clampNumber(layout.height * scale, 72, canvas.height * 0.42))

  return {
    x: Math.round((canvas.width - width) / 2),
    y: Math.round((canvas.height - height) / 2),
    width,
    height,
    radius: Math.round(clampNumber(layout.radius * scale, 0, 80)),
    size: Math.round(clampNumber(layout.size * scale, 22, 82)),
  }
}

const createTemplateElement = (type = 'div', canvas, index) => {
  const layout = getDefaultElementLayout(type, canvas)

  const base = {
    id: `element-${Date.now()}`,
    type,
    name: `Element ${index}`,
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    rotation: 0,
    radius: layout.radius,
    background: ['image', 'video', 'text'].includes(type) ? '#ffffff' : '#e5e7eb',
    color: '#374151',
    align: 'center',
    size: layout.size,
    fontWeight: 800,
    role: 'regular',
    layer: 'scene',
    mraidClick: false,
    nextSceneClick: false,
    nextSceneTarget: 'next',
    link: '',
    interactionSfx: '',
    interactionVolume: 1,
    applyToAllScenes: false,
    visible: true,
    popupEnabled: false,
    showAfterSeconds: 0,
    entranceAnimation: 'fade',
    fullWidth: false,
    fixedTop: false,
    fixedBottom: false,
    lockAspectRatio: false,
    alwaysVisible: false,
    backdropEnabled: false,
    backdropColor: '#202124',
    backdropOpacity: 1,
    backdropBlur: 0,
    backdropHeight: Math.max(layout.height, Math.round(250 * Math.min(canvas.width / 1080, canvas.height / 1920))),
    backdropPosition: 'element',
    backdropY: layout.y,
    backdropShadow: false,
    backdropShadowEdge: 'top',
    backdropShadowColor: '#000000',
    backdropShadowOpacity: 0.24,
    backdropShadowEndColor: '#000000',
    backdropShadowEndOpacity: 0,
    backdropShadowSize: Math.round(90 * Math.min(canvas.width / 1080, canvas.height / 1920)),
    zIndex: index,
    animation: 'none',
    speed: 1.35,
  }

  if (type === 'image' || type === 'video') {
    return {
      ...base,
      src: '',
      fit: 'contain',
      poster: '',
      autoplay: true,
      loop: true,
      muted: true,
    }
  }

  if (type === 'button') {
    return {
      ...base,
      text: 'Button',
    }
  }

  if (type === 'hotspot') {
    return {
      ...base,
      name: `Click Area ${index}`,
      text: '',
      nextSceneClick: true,
      nextSceneTarget: 'next',
      background: 'transparent',
      color: 'transparent',
      animation: 'none',
    }
  }

  if (type === 'text') {
    return {
      ...base,
      text: 'Text',
      background: '#ffffff',
      radius: 0,
    }
  }

  return {
    ...base,
    text: 'Text',
  }
}

const getTypeDefaults = (type) => {
  if (type === 'image') {
    return {
      type,
      text: undefined,
      src: '',
      fit: 'contain',
      poster: '',
      link: '',
      interactionSfx: '',
      interactionVolume: 1,
      nextSceneClick: false,
      nextSceneTarget: 'next',
      background: '#ffffff',
      radius: 0,
      animation: 'none',
    }
  }

  if (type === 'video') {
    return {
      type,
      text: undefined,
      src: '',
      fit: 'cover',
      poster: '',
      autoplay: true,
      loop: true,
      muted: true,
      link: '',
      interactionSfx: '',
      interactionVolume: 1,
      nextSceneClick: false,
      nextSceneTarget: 'next',
      background: '#ffffff',
      radius: 0,
      animation: 'none',
    }
  }

  if (type === 'button') {
    return {
      type,
      text: 'Button',
      src: undefined,
      fit: undefined,
      poster: undefined,
      link: '',
      interactionSfx: '',
      interactionVolume: 1,
      nextSceneClick: false,
      nextSceneTarget: 'next',
      background: '#e5e7eb',
      radius: 10,
      fontWeight: 800,
    }
  }

  if (type === 'hotspot') {
    return {
      type,
      text: '',
      src: undefined,
      fit: undefined,
      poster: undefined,
      link: '',
      interactionSfx: '',
      interactionVolume: 1,
      mraidClick: false,
      nextSceneClick: true,
      nextSceneTarget: 'next',
      background: 'transparent',
      color: 'transparent',
      radius: 16,
      fontWeight: 800,
      animation: 'none',
    }
  }

  if (type === 'text') {
    return {
      type,
      text: 'Text',
      src: undefined,
      fit: undefined,
      poster: undefined,
      link: '',
      interactionSfx: '',
      interactionVolume: 1,
      nextSceneClick: false,
      nextSceneTarget: 'next',
      background: '#ffffff',
      radius: 0,
      fontWeight: 800,
    }
  }

  return {
    type,
    text: 'Text',
    src: undefined,
    fit: undefined,
    poster: undefined,
    link: '',
    interactionSfx: '',
    interactionVolume: 1,
    nextSceneClick: false,
    nextSceneTarget: 'next',
    background: '#e5e7eb',
    radius: 8,
    fontWeight: 800,
  }
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const cssUrl = (value) => `url("${String(value).replaceAll('"', '\\"')}")`

const hexToRgba = (value, alpha = 1) => {
  const clean = String(value || '#000000').trim()

  if (/^rgba?\(/i.test(clean)) return clean

  const hex = clean.replace('#', '')
  const normalized = hex.length === 3
    ? hex.split('').map((character) => character + character).join('')
    : hex.padEnd(6, '0').slice(0, 6)
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const safeAlpha = Math.min(Math.max(Number(alpha) || 0, 0), 1)

  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })

const readImageDimensions = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image()

    image.addEventListener('load', () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
    }, { once: true })
    image.addEventListener('error', () => reject(new Error('Could not read this image size.')), {
      once: true,
    })
    image.src = src
  })

const readVideoDimensions = (src) =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video')

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.addEventListener('loadedmetadata', () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      })
      video.removeAttribute('src')
      video.load()
    }, { once: true })
    video.addEventListener('error', () => reject(new Error('Could not read this video size.')), {
      once: true,
    })
    video.src = src
  })

const readMediaDimensions = async (src, type) => {
  const dimensions = type === 'video'
    ? await readVideoDimensions(src)
    : await readImageDimensions(src)

  return dimensions.width > 0 && dimensions.height > 0 ? dimensions : null
}

const getCanvasFittedMediaSize = (dimensions, canvas, fallback) => {
  if (!dimensions?.width || !dimensions?.height) return fallback

  const scale = Math.min(1, canvas.width / dimensions.width, canvas.height / dimensions.height)

  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  }
}

const getMediaLayoutPatch = (element, dimensions, canvas) => {
  const size = getCanvasFittedMediaSize(dimensions, canvas, {
    width: element.width,
    height: element.height,
  })

  if (element.fullWidth) {
    const aspect = size.width / size.height
    return {
      height: Math.max(1, Math.round(Math.min(canvas.height, canvas.width / aspect))),
      lockAspectRatio: true,
    }
  }

  const centerX = element.x + element.width / 2
  const centerY = element.y + element.height / 2

  return {
    width: size.width,
    height: size.height,
    x: Math.round(clampNumber(centerX - size.width / 2, 0, Math.max(0, canvas.width - size.width))),
    y: element.fixedTop || element.fixedBottom
      ? element.y
      : Math.round(clampNumber(centerY - size.height / 2, 0, Math.max(0, canvas.height - size.height))),
    lockAspectRatio: true,
  }
}

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsText(file)
  })

const isDataUrl = (value) => /^data:/i.test(String(value ?? ''))
const isBlobUrl = (value) => /^blob:/i.test(String(value ?? ''))
const isExternalUrl = (value) => /^(?:data:|blob:|https?:|mailto:|tel:)/i.test(String(value ?? ''))

const extensionByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'text/html': 'html',
}

const getAssetExtension = (mimeType) => extensionByMimeType[mimeType.toLowerCase()] ?? 'bin'

const mimeTypeByExtension = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  html: 'text/html',
}

const getMimeTypeFromPath = (path) => {
  const extension = String(path).split('.').pop()?.toLowerCase()
  return extension ? mimeTypeByExtension[extension] ?? 'application/octet-stream' : 'application/octet-stream'
}

const sanitizeAssetName = (value) =>
  String(value || 'asset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'asset'

const getFileBaseName = (fileName) =>
  String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()

const sanitizeExportFileName = (value) =>
  String(value || 'template')
    .trim()
    .replace(/\.[^.]+$/, '')
    .split('')
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character,
    )
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'template'

const dataUrlToAssetBytes = (dataUrl) => {
  const match = String(dataUrl).match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/i)
  if (!match) {
    throw new Error('Could not export an embedded asset.')
  }

  const mimeType = match[1] || 'application/octet-stream'
  const metadata = match[2] || ''
  const data = match[3] || ''

  if (metadata.toLowerCase().includes(';base64')) {
    const binary = atob(data.replace(/\s/g, ''))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return { bytes, mimeType }
  }

  return {
    bytes: new TextEncoder().encode(decodeURIComponent(data)),
    mimeType,
  }
}

const blobUrlToAssetBytes = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Could not export an imported asset.')
  }

  const blob = await response.blob()

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mimeType: blob.type || 'application/octet-stream',
  }
}

const convertPngDataUrlToWebpAsset = async (dataUrl) => {
  const image = new Image()
  image.decoding = 'async'
  image.src = dataUrl
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not prepare this PNG for WebP export.')
  }

  context.drawImage(image, 0, 0)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob)
          return
        }
        reject(new Error('This browser could not convert a PNG to WebP.'))
      },
      'image/webp',
      0.86,
    )
  })

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mimeType: blob.type || 'image/webp',
  }
}

const getAssetFolder = (mimeType, fallback = 'misc') => {
  const type = String(mimeType || '').toLowerCase()

  if (type.startsWith('image/')) return 'images'
  if (type.startsWith('video/')) return 'videos'
  if (type.startsWith('audio/')) return 'audio'
  if (type === 'text/html') return 'endscene'
  return fallback
}

const cleanEndSceneHtmlForExport = (html = '') =>
  String(html || '')
    .replace(/<script\b[^>]*\bsrc=["']mraid\.js["'][^>]*>\s*<\/script>/gi, '')

const externalizeTemplateAssets = async (settings, { referencePrefix, filePrefix, convertPngToWebp = false }) => {
  const nextSettings = JSON.parse(JSON.stringify(settings))
  const assetFiles = []
  const seenAssets = new Map()
  let assetIndex = 1

  nextSettings.overlay = {
    enabled: false,
    showInPreview: true,
    color: '#000000',
    opacity: 0.35,
    blur: 0,
    image: '',
    fit: 'cover',
    ...(nextSettings.overlay ?? {}),
  }

  const addExternalAsset = ({ bytes, mimeType, label, folder }) => {
    const extension = getAssetExtension(mimeType)
    const filename = `${String(assetIndex).padStart(2, '0')}-${sanitizeAssetName(label)}.${extension}`
    const assetFolder = folder ?? getAssetFolder(mimeType)
    const relativePath = `${assetFolder}/${filename}`
    const reference = `${referencePrefix}${relativePath}`

    assetIndex += 1
    assetFiles.push({
      path: `${filePrefix}${relativePath}`,
      content: bytes,
    })

    return reference
  }

  const externalizeAsset = async (value, label) => {
    if (!isDataUrl(value) && !isBlobUrl(value)) return value
    if (seenAssets.has(value)) return seenAssets.get(value)

    const originalAsset = isBlobUrl(value)
      ? await blobUrlToAssetBytes(value)
      : dataUrlToAssetBytes(value)
    const { bytes, mimeType } =
      convertPngToWebp && originalAsset.mimeType.toLowerCase() === 'image/png'
        ? await convertPngDataUrlToWebpAsset(value)
        : originalAsset
    const reference = addExternalAsset({ bytes, mimeType, label })
    seenAssets.set(value, reference)

    return reference
  }

  const externalizeTextAsset = (value, label, folder = 'endscene') => {
    if (!value) return ''
    const key = `text:${folder}:${value}`
    if (seenAssets.has(key)) return seenAssets.get(key)

    const reference = addExternalAsset({
      bytes: new TextEncoder().encode(value),
      mimeType: 'text/html',
      label,
      folder,
    })

    seenAssets.set(key, reference)
    return reference
  }

  const externalizeSettingsAssets = async (targetSettings, labelPrefix = '') => {
    targetSettings.audio = cloneAudioSettings(targetSettings.audio)
    targetSettings.overlay = {
      enabled: false,
      showInPreview: true,
      color: '#000000',
      opacity: 0.35,
      blur: 0,
      image: '',
      fit: 'cover',
      ...(targetSettings.overlay ?? {}),
    }

    targetSettings.background.image = await externalizeAsset(
      targetSettings.background.image,
      `${labelPrefix}background`,
    )
    targetSettings.overlay.image = await externalizeAsset(
      targetSettings.overlay?.image,
      `${labelPrefix}overlay-backdrop`,
    )
    targetSettings.header.image = await externalizeAsset(
      targetSettings.header.image,
      `${labelPrefix}header`,
    )
    targetSettings.body.image = await externalizeAsset(
      targetSettings.body.image,
      `${labelPrefix}body-image`,
    )
    targetSettings.audio.backgroundMusic = await externalizeAsset(
      targetSettings.audio.backgroundMusic,
      `${labelPrefix}background-music`,
    )
    targetSettings.elements = await Promise.all(
      getElements(targetSettings).map(async (element, index) => ({
        ...element,
        src: await externalizeAsset(
          element.src,
          `${labelPrefix}${element.name || `${element.type}-${index + 1}`}`,
        ),
        poster: await externalizeAsset(
          element.poster,
          `${labelPrefix}${element.name || `video-${index + 1}`}-poster`,
        ),
        interactionSfx: await externalizeAsset(
          element.interactionSfx,
          `${labelPrefix}${element.name || `interaction-${index + 1}`}-sfx`,
        ),
      })),
    )
  }

  await externalizeSettingsAssets(nextSettings)

  if (Array.isArray(nextSettings.scenes)) {
    nextSettings.scenes = await Promise.all(
      nextSettings.scenes.map(async (scene, index) => {
        const nextScene = JSON.parse(JSON.stringify(scene))
        nextScene.settings = normalizeTemplateSettings(nextScene.settings ?? nextSettings)
        await externalizeSettingsAssets(nextScene.settings, `scene-${index + 1}-`)
        nextScene.sceneChangeSfx = await externalizeAsset(
          nextScene.sceneChangeSfx,
          `scene-${index + 1}-change-sfx`,
        )

        if (nextScene.referenceImage?.src) {
          nextScene.referenceImage.src = await externalizeAsset(
            nextScene.referenceImage.src,
            `scene-${index + 1}-reference`,
          )
        }

        return nextScene
      }),
    )
  }

  if (nextSettings.endScene?.enabled && nextSettings.endScene?.html) {
    nextSettings.endScene.html = cleanEndSceneHtmlForExport(nextSettings.endScene.html)
    nextSettings.endScene.src = externalizeTextAsset(
      nextSettings.endScene.html,
      nextSettings.endScene.name || 'EndScene',
      'endscene',
    )
  }

  return {
    settings: nextSettings,
    files: assetFiles,
  }
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

const crc32 = (bytes) => {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const writeUint16 = (target, offset, value) => {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

const writeUint32 = (target, offset, value) => {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

const readUint16 = (target, offset) => target[offset] | (target[offset + 1] << 8)

const readUint32 = (target, offset) =>
  (target[offset]
    | (target[offset + 1] << 8)
    | (target[offset + 2] << 16)
    | (target[offset + 3] << 24)) >>> 0

const inflateRawZipEntry = async (bytes) => {
  if (!('DecompressionStream' in window)) {
    throw new Error('This compressed zip cannot be imported in this browser.')
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const isTextProjectFile = (path) => /\.(html|js|mjs|jsx|css|json)$/i.test(path)

const createAssetBlob = (bytes, path) =>
  new Blob([bytes], { type: getMimeTypeFromPath(path) })

const readZipProjectFiles = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const decoder = new TextDecoder()
  const textFiles = {}
  const assetFiles = {}
  let offset = 0

  while (offset + 30 <= bytes.length) {
    const signature = readUint32(bytes, offset)
    if (signature === 0x02014b50 || signature === 0x06054b50) break
    if (signature !== 0x04034b50) {
      throw new Error('This project zip cannot be imported.')
    }

    const method = readUint16(bytes, offset + 8)
    const compressedSize = readUint32(bytes, offset + 18)
    const fileNameLength = readUint16(bytes, offset + 26)
    const extraLength = readUint16(bytes, offset + 28)
    const nameStart = offset + 30
    const dataStart = nameStart + fileNameLength + extraLength
    const dataEnd = dataStart + compressedSize

    if (dataEnd > bytes.length) {
      throw new Error('This project zip is incomplete.')
    }

    const name = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength))
    const compressedBytes = bytes.slice(dataStart, dataEnd)
    const fileBytes = method === 0
      ? compressedBytes
      : method === 8
        ? await inflateRawZipEntry(compressedBytes)
        : null

    if (!fileBytes) {
      throw new Error('This zip compression method is not supported.')
    }

    if (isTextProjectFile(name)) {
      textFiles[name] = decoder.decode(fileBytes)
    } else if (!name.endsWith('/')) {
      assetFiles[name] = createAssetBlob(fileBytes, name)
    }
    offset = dataEnd
  }

  return {
    textFiles,
    assetFiles,
  }
}

const getFileTemplateName = (fileName) => {
  const cleanName = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return cleanName || 'Imported Template'
}

const parseStyleText = (styleText = '') =>
  Object.fromEntries(
    styleText
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf(':')
        return separator === -1
          ? [part, '']
          : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
      }),
  )

const parsePixelValue = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? '').replace('px', ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseFirstNumber = (value, fallback = 0) => {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/)
  const parsed = match ? Number.parseFloat(match[0]) : Number.NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseRotationValue = (value, fallback = 0) => {
  const match = String(value ?? '').match(/rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/i)
  const parsed = match ? Number.parseFloat(match[1]) : Number.NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseCssBlock = (css, selector) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`))
  return match ? parseStyleText(match[1]) : {}
}

const parseCssUrl = (value = '') => {
  const match = value.match(/url\((['"]?)(.*?)\1\)/)
  return match?.[2] ?? ''
}

const getClassValue = (classList, prefix, fallback) =>
  Array.from(classList)
    .find((className) => className.startsWith(prefix))
    ?.slice(prefix.length) ?? fallback

const normalizeTemplateSettings = (importedSettings) => {
  const base = cloneTemplate('starter', starterTemplates)
  const canvas = {
    ...base.canvas,
    ...(importedSettings.canvas ?? {}),
  }

  return {
    ...base,
    ...importedSettings,
    canvas,
    background: {
      ...base.background,
      ...(importedSettings.background ?? {}),
    },
    overlay: {
      ...base.overlay,
      ...(importedSettings.overlay ?? {}),
    },
    audio: cloneAudioSettings(importedSettings.audio ?? base.audio),
    endScene: cloneEndScene(importedSettings.endScene ?? base.endScene),
    body: {
      ...base.body,
      ...(importedSettings.body ?? {}),
    },
    header: {
      ...base.header,
      ...(importedSettings.header ?? {}),
    },
    cta: {
      ...base.cta,
      ...(importedSettings.cta ?? {}),
    },
    elements: Array.isArray(importedSettings.elements)
      ? importedSettings.elements.map((element, index) => {
          const importedRole = getElementRole(element)

          return {
            ...createTemplateElement(element.type ?? 'div', canvas, index + 1),
            ...element,
            id: element.id || `imported-element-${Date.now()}-${index}`,
            zIndex: element.zIndex ?? index + 1,
            rotation: Number.isFinite(Number(element.rotation)) ? Number(element.rotation) : 0,
            fontWeight: element.fontWeight ?? 800,
            role: importedRole === 'cta' ? 'regular' : importedRole,
            mraidClick: element.mraidClick ?? importedRole === 'cta',
            nextSceneClick: element.nextSceneClick ?? false,
            nextSceneTarget: element.nextSceneTarget ?? 'next',
            link: element.link ?? '',
            interactionSfx: element.interactionSfx ?? '',
            interactionVolume: Math.min(Math.max(Number(element.interactionVolume ?? 1) || 0, 0), 1),
            applyToAllScenes: element.applyToAllScenes ?? false,
            visible: element.visible ?? true,
            popupEnabled: element.popupEnabled ?? false,
            showAfterSeconds: getElementDelaySeconds(element),
            entranceAnimation: element.entranceAnimation ?? 'fade',
            layer: getElementLayer(element),
            fixedTop: element.fixedTop ?? false,
            fixedBottom: element.fixedBottom ?? false,
            lockAspectRatio: element.lockAspectRatio ?? false,
            alwaysVisible: element.alwaysVisible ?? false,
            backdropEnabled: element.backdropEnabled ?? false,
            backdropColor: element.backdropColor ?? '#202124',
            backdropOpacity: element.backdropOpacity ?? 1,
            backdropBlur: element.backdropBlur ?? 0,
            backdropHeight: element.backdropHeight ?? Math.max(element.height ?? 1, Math.round(250 * Math.min(canvas.width / 1080, canvas.height / 1920))),
            backdropPosition: element.backdropPosition ?? 'element',
            backdropY: element.backdropY ?? element.y ?? 0,
            backdropShadow: element.backdropShadow ?? false,
            backdropShadowEdge: element.backdropShadowEdge ?? 'top',
            backdropShadowColor: element.backdropShadowColor ?? '#000000',
            backdropShadowOpacity: element.backdropShadowOpacity ?? 0.24,
            backdropShadowEndColor: element.backdropShadowEndColor ?? element.backdropShadowColor ?? '#000000',
            backdropShadowEndOpacity: element.backdropShadowEndOpacity ?? 0,
            backdropShadowSize: element.backdropShadowSize ?? Math.round(90 * Math.min(canvas.width / 1080, canvas.height / 1920)),
          }
        })
      : [],
  }
}

const parseExportedStringLiteral = (source, startIndex) => {
  const quote = source[startIndex]
  let escaped = false

  for (let index = startIndex + 1; index < source.length; index += 1) {
    const char = source[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === quote) {
      const literal = source.slice(startIndex, index + 1)
      if (quote === '"') return JSON.parse(literal)

      return literal
        .slice(1, -1)
        .replaceAll('\\n', '\n')
        .replaceAll('\\r', '\r')
        .replaceAll('\\t', '\t')
        .replaceAll("\\'", "'")
        .replaceAll('\\"', '"')
        .replaceAll('\\\\', '\\')
    }
  }

  throw new Error('Could not read the exported template markup.')
}

const extractMarkupFromJavascript = (source) => {
  const match = source.match(/insertAdjacentHTML\(\s*(['"])beforeend\1\s*,\s*(["'`])/)
  if (!match) return ''

  const literalStart = match.index + match[0].length - 1
  return parseExportedStringLiteral(source, literalStart)
}

const buildSettingsFromExportedMarkup = ({ markup, css = '', script = '' }) => {
  if (!markup) {
    throw new Error('This export does not include readable template markup.')
  }

  const base = cloneTemplate('starter', starterTemplates)
  const document = new DOMParser().parseFromString(markup, 'text/html')
  const app = document.querySelector('.app')
  if (!app) {
    throw new Error('This export does not look like a template builder project.')
  }

  const appCss = parseCssBlock(css, '.app')
  const bodyCss = parseCssBlock(css, 'body')
  const bodyBeforeCss = parseCssBlock(css, 'body::before')
  const scriptWidth = script.match(/const\s+baseWidth\s*=\s*(\d+)/)?.[1]
  const scriptHeight = script.match(/const\s+baseHeight\s*=\s*(\d+)/)?.[1]
  const scriptScalePosition = script.match(/const\s+scalePosition\s*=\s*['"](\w+)['"]/)?.[1]
  const canvas = {
    width: Number(scriptWidth) || parsePixelValue(appCss.width, base.canvas.width),
    height: Number(scriptHeight) || parsePixelValue(appCss.height, base.canvas.height),
    scalePosition: scriptScalePosition ?? base.canvas.scalePosition,
  }
  const starterBody = document.querySelector('.starter-body')
  const starterBodyStyle = parseStyleText(starterBody?.getAttribute('style'))
  const backgroundImage = parseCssUrl(bodyBeforeCss['background-image'] ?? bodyCss['background-image'])
  const backgroundSize = bodyBeforeCss['background-size'] ?? bodyCss['background-size'] ?? base.background.fit
  const overlayBackdropCss = parseCssBlock(css, '.template-overlay-backdrop')
  const overlayBackdropImage = parseCssUrl(overlayBackdropCss['background-image'])
  const overlayBackdropSize = overlayBackdropCss['background-size'] ?? base.overlay.fit
  const body = {
    enabled: Boolean(starterBody),
    mode: starterBody ? getClassValue(starterBody.classList, 'middle-', base.body.mode) : base.body.mode,
    title: document.querySelector('.middle-title')?.textContent ?? base.body.title,
    subtitle: document.querySelector('.middle-subtitle')?.textContent ?? base.body.subtitle,
    panel: starterBodyStyle['--middle-panel'] ?? base.body.panel,
    accent: starterBodyStyle['--middle-accent'] ?? base.body.accent,
    textColor: starterBodyStyle['--middle-text'] ?? base.body.textColor,
    image: document.querySelector('.middle-image-frame img')?.getAttribute('src') ?? base.body.image,
    imageFit: parseStyleText(document.querySelector('.middle-image-frame img')?.getAttribute('style'))['object-fit'] ?? base.body.imageFit,
    x: parsePixelValue(starterBodyStyle.left, base.body.x),
    y: parsePixelValue(starterBodyStyle.top, base.body.y),
    width: parsePixelValue(starterBodyStyle.width, base.body.width),
    height: parsePixelValue(starterBodyStyle.height, base.body.height),
  }
  const elements = Array.from(document.querySelectorAll('.template-element')).map((node, index) => {
    const style = parseStyleText(node.getAttribute('style'))
    const type = getClassValue(node.classList, 'element-', 'div')
    const animation = getClassValue(node.classList, 'animation-', 'none')
    const align = getClassValue(node.classList, 'align-', 'center')
    const fullWidth = node.classList.contains('screen-width')
    const fixedTop = node.classList.contains('fixed-top')
    const fixedBottom = node.classList.contains('fixed-bottom')
    const textNode = node.querySelector('.element-text-content') ?? node.cloneNode(true)

    if (!node.querySelector('.element-text-content')) {
      textNode.querySelector?.('.ping')?.remove()
    }

    const importedElement = {
      ...createTemplateElement(type, canvas, index + 1),
      id: node.id || `imported-element-${Date.now()}-${index}`,
      name: node.id || `Element ${index + 1}`,
      x: parsePixelValue(style.left, 0),
      y: parsePixelValue(style.top, 0),
      width: fullWidth ? canvas.width : parsePixelValue(style.width, canvas.width),
      height: parsePixelValue(style.height, 80),
      radius: parsePixelValue(style['border-radius'], 0),
      background: style.background ?? base.body.panel,
      color: style.color ?? '#374151',
      align,
      size: parsePixelValue(style['font-size'], 22),
      fontWeight: parsePixelValue(style['font-weight'], 800),
      fullWidth,
      fixedTop,
      fixedBottom,
      rotation: parseRotationValue(style.transform, 0),
      layer: node.closest('.template-overlay-layer') ? 'overlay' : 'scene',
      zIndex: parsePixelValue(style['z-index'], index + 1),
      animation,
      speed: parsePixelValue(style['--element-animation-speed'], 1.35),
      role: node.classList.contains('role-cta') || node.classList.contains('template-cta')
        ? 'cta'
        : node.classList.contains('role-header') || node.classList.contains('template-header')
          ? 'header'
          : 'regular',
      mraidClick: node.dataset.mraidClick === 'true'
        || node.classList.contains('role-cta')
        || node.classList.contains('template-cta'),
      nextSceneClick: node.dataset.nextSceneClick === 'true',
      nextSceneTarget: node.dataset.sceneTarget || 'next',
      link: node.getAttribute('data-link') ?? '',
      interactionSfx: node.dataset.interactionSfx ?? '',
      interactionVolume: Math.min(Math.max(Number(node.dataset.interactionVolume ?? 1) || 0, 0), 1),
      text: textNode.textContent ?? '',
    }

    if (type === 'image') {
      const image = node.querySelector('img')
      return {
        ...importedElement,
        src: image?.getAttribute('src') ?? '',
        fit: parseStyleText(image?.getAttribute('style'))['object-fit'] ?? 'contain',
      }
    }

    if (type === 'video') {
      const video = node.querySelector('video')
      return {
        ...importedElement,
        src: video?.getAttribute('src') ?? '',
        fit: parseStyleText(video?.getAttribute('style'))['object-fit'] ?? 'cover',
        poster: video?.getAttribute('poster') ?? '',
        autoplay: video?.hasAttribute('autoplay') ?? true,
        loop: video?.hasAttribute('loop') ?? true,
        muted: video?.hasAttribute('muted') ?? true,
      }
    }

    if (type === 'button') {
      return importedElement
    }

    return importedElement
  })
  const endSceneRoot = document.getElementById('end-scene-root')
  const endSceneFrame = endSceneRoot?.querySelector('.end-scene-frame')
  const endSceneClickLayer = endSceneRoot?.querySelector('.end-scene-click-layer')

  return normalizeTemplateSettings({
    ...base,
    canvas,
    background: {
      ...base.background,
      mode: backgroundImage ? 'image' : 'color',
      color: bodyBeforeCss['background-color'] ?? bodyCss['background-color'] ?? base.background.color,
      image: backgroundImage,
      fit: backgroundSize === '100% 100%' ? 'stretch' : backgroundSize,
      opacity: parsePixelValue(bodyBeforeCss.opacity, base.background.opacity),
    },
    overlay: {
      ...base.overlay,
      enabled: Boolean(document.querySelector('.template-overlay-layer')),
      color: overlayBackdropCss['background-color'] ?? overlayBackdropCss.background ?? base.overlay.color,
      opacity: parsePixelValue(overlayBackdropCss.opacity, base.overlay.opacity),
      blur: parseFirstNumber(
        overlayBackdropCss['backdrop-filter'] ?? overlayBackdropCss['-webkit-backdrop-filter'],
        base.overlay.blur,
      ),
      image: overlayBackdropImage,
      fit: overlayBackdropSize === '100% 100%' ? 'stretch' : overlayBackdropSize,
    },
    body,
    elements,
    endScene: {
      ...base.endScene,
      enabled: Boolean(
        endSceneRoot
        && (endSceneFrame?.getAttribute('srcdoc') || endSceneFrame?.getAttribute('src')),
      ),
      name: endSceneFrame?.getAttribute('title') ?? base.endScene.name,
      html: endSceneFrame?.getAttribute('srcdoc') ?? '',
      src: endSceneFrame?.getAttribute('src') ?? '',
      clickUrl: endSceneClickLayer?.getAttribute('data-link') ?? '',
      animation: endSceneRoot?.getAttribute('data-animation') ?? base.endScene.animation,
    },
  })
}

const readSettingsFromHtml = (html) => {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const dataElement = document.getElementById('template-builder-data')
  if (dataElement?.textContent) {
    return JSON.parse(dataElement.textContent)
  }

  const markup = document.querySelector('.app-wrapper')?.outerHTML
  const css = Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .join('\n')
  const script = Array.from(document.querySelectorAll('script:not([type="application/json"])'))
    .map((scriptElement) => scriptElement.textContent ?? '')
    .join('\n')

  return buildSettingsFromExportedMarkup({ markup, css, script })
}

const stripAssetQuery = (value) => String(value).split('#')[0].split('?')[0]

const getAssetPathCandidates = (value) => {
  if (!value || isExternalUrl(value)) return []

  const clean = stripAssetQuery(value)
    .replaceAll('\\', '/')
    .replace(/^\.?\//, '')
    .replace(/^\/+/, '')
  const candidates = new Set([clean])
  const assetIndex = clean.lastIndexOf('/assets/')
  const basename = clean.split('/').pop()

  if (clean.startsWith('assets/')) {
    candidates.add(`src/${clean}`)
    candidates.add(`public/${clean}`)
  }

  if (clean.startsWith('src/assets/')) {
    candidates.add(clean.slice('src/'.length))
  }

  if (clean.startsWith('public/assets/')) {
    candidates.add(clean.slice('public/'.length))
  }

  if (assetIndex >= 0) {
    const suffix = clean.slice(assetIndex + 1)
    candidates.add(suffix)
    candidates.add(`src/${suffix}`)
    candidates.add(`public/${suffix}`)
  }

  if (basename) candidates.add(basename)

  return [...candidates].filter(Boolean)
}

const createProjectAssetMap = (assetFiles = {}) => {
  const map = new Map()

  Object.entries(assetFiles).forEach(([path, blob]) => {
    const url = URL.createObjectURL(blob)
    const cleanPath = path.replaceAll('\\', '/').replace(/^\.?\//, '').replace(/^\/+/, '')
    const basename = cleanPath.split('/').pop()
    const assetIndex = cleanPath.lastIndexOf('/assets/')
    const keys = new Set([cleanPath])

    if (cleanPath.startsWith('assets/')) {
      keys.add(`src/${cleanPath}`)
      keys.add(`public/${cleanPath}`)
    }

    if (cleanPath.startsWith('src/assets/')) {
      keys.add(cleanPath.slice('src/'.length))
    }

    if (cleanPath.startsWith('public/assets/')) {
      keys.add(cleanPath.slice('public/'.length))
    }

    if (assetIndex >= 0) {
      const suffix = cleanPath.slice(assetIndex + 1)
      keys.add(suffix)
      keys.add(`src/${suffix}`)
      keys.add(`public/${suffix}`)
    }

    if (basename) keys.add(basename)

    keys.forEach((key) => {
      if (!map.has(key)) map.set(key, url)
    })
  })

  return map
}

const resolveImportedAsset = (value, assetMap) => {
  if (!value || isExternalUrl(value)) return value

  const match = getAssetPathCandidates(value).find((candidate) => assetMap.has(candidate))
  return match ? assetMap.get(match) : value
}

const resolveImportedAssetReferences = (settings, assetFiles) => {
  const assetMap = createProjectAssetMap(assetFiles)
  if (assetMap.size === 0) return settings

  const resolveSettingsAssets = (targetSettings) => {
    const nextTargetSettings = normalizeTemplateSettings(targetSettings)

    nextTargetSettings.background.image = resolveImportedAsset(nextTargetSettings.background.image, assetMap)
    nextTargetSettings.overlay.image = resolveImportedAsset(nextTargetSettings.overlay?.image, assetMap)
    nextTargetSettings.header.image = resolveImportedAsset(nextTargetSettings.header.image, assetMap)
    nextTargetSettings.body.image = resolveImportedAsset(nextTargetSettings.body.image, assetMap)
    nextTargetSettings.elements = getElements(nextTargetSettings).map((element) => ({
      ...element,
      src: resolveImportedAsset(element.src, assetMap),
      poster: resolveImportedAsset(element.poster, assetMap),
    }))

    return nextTargetSettings
  }

  const nextSettings = resolveSettingsAssets(settings)

  if (Array.isArray(settings.scenes)) {
    nextSettings.scenes = settings.scenes.map((scene, index) => ({
      ...scene,
      ...normalizeSceneMeta(scene, index),
      id: scene.id || `scene-${index + 1}`,
      name: scene.name || `Scene ${index + 1}`,
      settings: resolveSettingsAssets(scene.settings ?? settings),
      referenceImage: {
        ...cloneReferenceImage(scene.referenceImage),
        src: resolveImportedAsset(scene.referenceImage?.src, assetMap),
      },
    }))
  }

  return nextSettings
}

const readSettingsFromProjectFiles = (files) => {
  const entries = Object.entries(files).map(([path, content]) => ({
    path: path.replaceAll('\\', '/'),
    content,
  }))
  const templateEntry = entries.find(({ path }) => path.endsWith('template.json'))

  if (templateEntry) {
    return JSON.parse(templateEntry.content)
  }

  const htmlEntries = entries.filter(({ path }) => path.toLowerCase().endsWith('.html'))
  const htmlWithTemplateData = htmlEntries.find(({ content }) =>
    content.includes('template-builder-data'),
  )
  if (htmlWithTemplateData) {
    return readSettingsFromHtml(htmlWithTemplateData.content)
  }

  const htmlWithMarkup = htmlEntries.find(({ content }) => content.includes('app-wrapper'))
  if (htmlWithMarkup) {
    return readSettingsFromHtml(htmlWithMarkup.content)
  }

  const css = entries
    .filter(({ path }) => path.toLowerCase().endsWith('.css'))
    .map(({ content }) => content)
    .join('\n')
  const javascriptEntries = entries.filter(({ path }) =>
    /\.(js|mjs|jsx)$/i.test(path),
  )
  const javascriptWithMarkup = javascriptEntries.find(({ content }) =>
    content.includes('insertAdjacentHTML') && content.includes('app-wrapper'),
  )

  if (javascriptWithMarkup) {
    return buildSettingsFromExportedMarkup({
      markup: extractMarkupFromJavascript(javascriptWithMarkup.content),
      css,
      script: javascriptWithMarkup.content,
    })
  }

  throw new Error('This project does not include template.json or readable exported template data.')
}

const readSettingsFromProjectZip = async (file) => {
  const { textFiles, assetFiles } = await readZipProjectFiles(file)
  return resolveImportedAssetReferences(readSettingsFromProjectFiles(textFiles), assetFiles)
}

const readSettingsFromProjectFolder = async (fileList) => {
  const textEntries = []
  const assetEntries = []

  await Promise.all(
    Array.from(fileList).map(async (file) => {
      const path = file.webkitRelativePath || file.name

      if (isTextProjectFile(path)) {
        textEntries.push([path, await readFileAsText(file)])
        return
      }

      assetEntries.push([path, file.type ? file : new Blob([file], { type: getMimeTypeFromPath(path) })])
    }),
  )

  return resolveImportedAssetReferences(
    readSettingsFromProjectFiles(Object.fromEntries(textEntries)),
    Object.fromEntries(assetEntries),
  )
}

const createZip = (files) => {
  const encoder = new TextEncoder()
  const localParts = []
  const centralParts = []
  let offset = 0
  const now = new Date()
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const dosDate =
    ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  files.forEach(({ path, content }) => {
    const nameBytes = encoder.encode(path)
    const fileBytes = typeof content === 'string' ? encoder.encode(content) : content
    const checksum = crc32(fileBytes)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    writeUint32(localHeader, 0, 0x04034b50)
    writeUint16(localHeader, 4, 20)
    writeUint16(localHeader, 6, 0)
    writeUint16(localHeader, 8, 0)
    writeUint16(localHeader, 10, dosTime)
    writeUint16(localHeader, 12, dosDate)
    writeUint32(localHeader, 14, checksum)
    writeUint32(localHeader, 18, fileBytes.length)
    writeUint32(localHeader, 22, fileBytes.length)
    writeUint16(localHeader, 26, nameBytes.length)
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, fileBytes)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    writeUint32(centralHeader, 0, 0x02014b50)
    writeUint16(centralHeader, 4, 20)
    writeUint16(centralHeader, 6, 20)
    writeUint16(centralHeader, 8, 0)
    writeUint16(centralHeader, 10, 0)
    writeUint16(centralHeader, 12, dosTime)
    writeUint16(centralHeader, 14, dosDate)
    writeUint32(centralHeader, 16, checksum)
    writeUint32(centralHeader, 20, fileBytes.length)
    writeUint32(centralHeader, 24, fileBytes.length)
    writeUint16(centralHeader, 28, nameBytes.length)
    writeUint32(centralHeader, 42, offset)
    centralHeader.set(nameBytes, 46)

    centralParts.push(centralHeader)
    offset += localHeader.length + fileBytes.length
  })

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
  const endRecord = new Uint8Array(22)
  writeUint32(endRecord, 0, 0x06054b50)
  writeUint16(endRecord, 8, files.length)
  writeUint16(endRecord, 10, files.length)
  writeUint32(endRecord, 12, centralSize)
  writeUint32(endRecord, 16, offset)

  return new Blob([...localParts, ...centralParts, endRecord], { type: 'application/zip' })
}

const serializeTemplateSettings = (settings) => JSON.stringify(settings, null, 2)

const buildTemplateDataScript = (settings) =>
  `<script type="application/json" id="template-builder-data">${serializeTemplateSettings(settings)
    .replaceAll('</', '<\\/')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')}</script>`

const buildExportModel = (settings) => {
  const backgroundSize =
    settings.background.fit === 'stretch' ? '100% 100%' : settings.background.fit
  const bodyBackground = [
    `background-color: ${settings.background.color};`,
    settings.background.image
      ? `background-image: ${cssUrl(settings.background.image)}; background-size: ${backgroundSize};`
      : '',
  ].filter(Boolean).join(' ')
  const bodyBackgroundOpacity = settings.background.opacity ?? 1
  const overlay = {
    enabled: settings.overlay?.enabled ?? false,
    showInPreview: settings.overlay?.showInPreview ?? true,
    color: settings.overlay?.color ?? '#000000',
    opacity: settings.overlay?.opacity ?? 0.35,
    blur: settings.overlay?.blur ?? 0,
    image: settings.overlay?.image ?? '',
    fit: settings.overlay?.fit ?? 'cover',
  }
  const headerHtml = settings.header.mode === 'image' && settings.header.image
    ? `<img src="${escapeHtml(settings.header.image)}" alt="Logo" style="width:${settings.header.imageWidth}px" />`
    : `<strong style="font-size:${settings.header.size}px">${escapeHtml(settings.header.title)}</strong><span>${escapeHtml(settings.header.tagline)}</span>`

  return {
    bodyBackground,
    bodyBackgroundOpacity,
    overlay,
    headerHtml,
    elements: getElements(settings),
    showCanvasHeader: settings.header.enabled !== false && !settings.header.fullWidth,
    showScreenHeader: settings.header.enabled !== false && settings.header.fullWidth,
    showCta: settings.cta.enabled !== false,
    settings,
  }
}

const buildTemplateCss = (settings) => {
  const model = buildExportModel(settings)

  return `
html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

body {
  background: transparent;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  ${model.bodyBackground}
  background-position: center;
  background-repeat: no-repeat;
  opacity: ${model.bodyBackgroundOpacity};
}

.template-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
}

.template-overlay-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-color: ${model.overlay.color};
  ${model.overlay.image ? `background-image: ${cssUrl(model.overlay.image)};` : ''}
  background-position: center;
  background-repeat: no-repeat;
  background-size: ${model.overlay.fit === 'stretch' ? '100% 100%' : model.overlay.fit};
  opacity: ${model.overlay.opacity};
  ${model.overlay.blur > 0 ? `backdrop-filter: blur(${model.overlay.blur}px); -webkit-backdrop-filter: blur(${model.overlay.blur}px);` : ''}
}

.template-overlay-layer .template-element {
  pointer-events: auto;
}

.element-backdrop {
  position: absolute;
  box-sizing: border-box;
  overflow: visible;
  pointer-events: none;
}

.element-backdrop.screen-width {
  left: 50% !important;
  width: var(--app-screen-width, calc(100vw / var(--app-scale, 1))) !important;
  transform: translateX(-50%);
}

.element-backdrop.backdrop-shadow::after {
  position: absolute;
  right: 0;
  left: 0;
  height: var(--backdrop-shadow-size, 90px);
  content: "";
  pointer-events: none;
}

.element-backdrop.backdrop-shadow-top::after {
  bottom: 100%;
  background: linear-gradient(to top, var(--backdrop-shadow-start), var(--backdrop-shadow-end));
}

.element-backdrop.backdrop-shadow-bottom::after {
  top: 100%;
  background: linear-gradient(to bottom, var(--backdrop-shadow-start), var(--backdrop-shadow-end));
}

.app-wrapper {
  position: fixed;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.end-scene-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  pointer-events: none;
}

.end-scene-root[hidden] {
  display: none;
}

.end-scene-frame {
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  border: 0;
  background: #000000;
  pointer-events: none;
}

.end-scene-fade .end-scene-frame {
  animation: end-fade-in 560ms ease both;
}

.end-scene-slide-right .end-scene-frame {
  animation: end-slide-right-in 560ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.end-scene-slide-left .end-scene-frame {
  animation: end-slide-left-in 560ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.end-scene-slide-up .end-scene-frame {
  animation: end-slide-up-in 560ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.end-scene-slide-down .end-scene-frame {
  animation: end-slide-down-in 560ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.end-scene-zoom .end-scene-frame {
  animation: end-zoom-in 560ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.end-scene-click-layer {
  position: fixed;
  inset: 0;
  z-index: 10000;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
}

.app {
  position: absolute;
  width: ${settings.canvas.width}px;
  height: ${settings.canvas.height}px;
  transform-origin: top left;
  overflow: visible;
}

.template-element {
  position: absolute;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 0 12px;
  font-weight: 800;
  line-height: 1.15;
  white-space: pre-line;
}

.template-element.screen-width {
  left: 50% !important;
  z-index: 10;
  width: var(--app-screen-width, calc(100vw / var(--app-scale, 1))) !important;
  transform: translateX(-50%);
}

.template-element.fixed-top {
  top: var(--app-fixed-top-y, 0px) !important;
}

.template-element.fixed-bottom {
  top: calc(var(--app-fixed-bottom-edge, var(--element-height, 0px)) - var(--element-height, 0px)) !important;
}

.template-element.align-left {
  justify-items: start;
  text-align: left;
}

.template-element.align-center {
  justify-items: center;
  text-align: center;
}

.template-element.align-right {
  justify-items: end;
  text-align: right;
}

.template-element.element-image {
  padding: 0;
}

.template-element.element-video {
  padding: 0;
}

.template-element.element-text {
  padding: 0;
}

.template-element.element-button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.template-element.element-hotspot {
  padding: 0;
  color: transparent !important;
  background: transparent !important;
  border: 0;
  box-shadow: none;
}

.template-element[data-mraid-click="true"],
.template-element[data-next-scene-click="true"] {
  cursor: pointer;
}

.template-element.popup-element,
.template-element[data-popup-element="true"] {
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.24);
}

.template-element img,
.template-element video {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.template-element.animation-pulse {
  animation: cta-pulse var(--element-animation-speed, 1.35s) infinite;
}

.template-element.animation-bounce {
  animation: cta-bounce var(--element-animation-speed, 1.35s) infinite;
}

.template-element.entrance-fade,
.element-backdrop.entrance-fade {
  animation: element-fade-in 420ms ease both;
}

.template-element.entrance-slide-up,
.element-backdrop.entrance-slide-up {
  animation: element-slide-up-in 460ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.template-element.entrance-slide-down,
.element-backdrop.entrance-slide-down {
  animation: element-slide-down-in 460ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.template-element.entrance-slide-left,
.element-backdrop.entrance-slide-left {
  animation: element-slide-left-in 460ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.template-element.entrance-slide-right,
.element-backdrop.entrance-slide-right {
  animation: element-slide-right-in 460ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.template-element.entrance-zoom,
.element-backdrop.entrance-zoom {
  animation: element-zoom-in 420ms cubic-bezier(0.2, 0.82, 0.24, 1) both;
}

.template-element .ping {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.26);
  animation: cta-ping var(--element-animation-speed, 1.35s) infinite;
}

.template-element .element-text-content {
  position: relative;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
}

.template-header {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 4px;
}

.template-header.screen-width {
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
}

.template-header img {
  display: block;
  max-width: 100%;
  height: auto;
}

.template-header strong {
  display: block;
  line-height: 1;
}

.template-header span {
  display: block;
  font-size: 16px;
  line-height: 1.25;
}

.template-cta {
  border: 0;
  display: grid;
  place-items: center;
  font: inherit;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.28);
}

.template-cta.animation-pulse {
  animation: cta-pulse var(--element-animation-speed, 1.35s) infinite;
}

.template-cta.animation-bounce {
  animation: cta-bounce var(--element-animation-speed, 1.35s) infinite;
}

.template-cta .ping {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.26);
  animation: cta-ping var(--element-animation-speed, 1.35s) infinite;
}

.template-cta strong {
  position: relative;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes cta-ping {
  0% { transform: scale(1); opacity: 0.44; }
  75%, 100% { transform: scale(1.16); opacity: 0; }
}

@keyframes cta-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

@keyframes cta-bounce {
  0%, 100% { transform: translateY(0); }
  45% { transform: translateY(-12%); }
}

@keyframes element-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes element-slide-up-in {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes element-slide-down-in {
  from { opacity: 0; transform: translateY(-28px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes element-slide-left-in {
  from { opacity: 0; transform: translateX(32px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes element-slide-right-in {
  from { opacity: 0; transform: translateX(-32px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes element-zoom-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes end-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes end-slide-right-in {
  from { transform: translateX(100vw); }
  to { transform: translateX(0); }
}

@keyframes end-slide-left-in {
  from { transform: translateX(-100vw); }
  to { transform: translateX(0); }
}

@keyframes end-slide-up-in {
  from { transform: translateY(100vh); }
  to { transform: translateY(0); }
}

@keyframes end-slide-down-in {
  from { transform: translateY(-100vh); }
  to { transform: translateY(0); }
}

@keyframes end-zoom-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
`.trim()
}

const buildElementMarkup = (element) => {
  const animation = element.animation ?? 'none'
  const role = getElementRole(element)
  const elementZIndex = element.alwaysVisible || element.popupEnabled ? 9999 : element.zIndex ?? 1
  const elementDelay = getElementDelaySeconds(element)
  const elementIsDelayed = element.visible !== false && elementDelay > 0
  const visibilityAttributes = elementIsDelayed
    ? ` data-show-after="${elementDelay}" data-entrance-animation="${escapeHtml(element.entranceAnimation ?? 'fade')}"`
    : ''
  const popupAttribute = element.popupEnabled ? ' data-popup-element="true"' : ''
  const clickAttribute = element.mraidClick || role === 'cta'
    ? ` data-mraid-click="true"${element.link ? ` data-link="${escapeHtml(element.link)}"` : ''}`
    : ''
  const nextSceneAttribute = element.nextSceneClick
    ? ` data-next-scene-click="true" data-scene-target="${escapeHtml(element.nextSceneTarget || 'next')}"`
    : ''
  const interactionAudioAttribute = element.interactionSfx
    ? ` data-interaction-sfx="${escapeHtml(element.interactionSfx)}" data-interaction-volume="${Math.min(Math.max(Number(element.interactionVolume ?? 1) || 0, 0), 1)}"`
    : ''
  const style = [
    element.fullWidth ? '' : `left:${element.x}px`,
    `top:${element.y}px`,
    element.fullWidth ? '' : `width:${element.width}px`,
    `height:${element.height}px`,
    `z-index:${elementZIndex}`,
    `border-radius:${element.radius ?? 0}px`,
    ['image', 'video', 'text', 'hotspot'].includes(element.type) ? '' : `background:${element.background}`,
    element.visible === false || elementIsDelayed ? 'display:none' : '',
    `transform:rotate(${Number(element.rotation ?? 0) || 0}deg)`,
    'transform-origin:center center',
    `color:${element.color ?? '#374151'}`,
    `font-size:${element.size ?? 22}px`,
    `font-weight:${element.fontWeight ?? 800}`,
    `--element-height:${element.height}px`,
    `--element-animation-speed:${element.speed ?? 1.35}s`,
  ].filter(Boolean).join('; ')
  const classes = [
    'template-element',
    role === 'header' ? 'template-header' : '',
    role === 'cta' ? 'template-cta' : '',
    `role-${role}`,
    `element-${element.type}`,
    `align-${element.align ?? 'center'}`,
    `animation-${animation}`,
    element.fullWidth ? 'screen-width' : '',
    element.fixedTop ? 'fixed-top' : '',
    element.fixedBottom ? 'fixed-bottom' : '',
    element.popupEnabled ? 'popup-element' : '',
  ].filter(Boolean).join(' ')
  const backdropHeight = element.backdropHeight ?? element.height
  const backdropY = Number.isFinite(Number(element.backdropY))
    ? Number(element.backdropY)
    : Math.round(element.y + element.height / 2 - backdropHeight / 2)
  const backdropMode = element.backdropPosition ?? 'element'
  const backdropTop = backdropMode === 'top'
    ? 'var(--app-fixed-top-y, 0px)'
    : backdropMode === 'screen'
      ? 'var(--app-fixed-top-y, 0px)'
    : `${backdropY}px`
  const backdropCssHeight = backdropMode === 'bottom'
    ? `calc(var(--app-fixed-bottom-edge, ${element.y + element.height}px) - ${backdropY}px)`
    : backdropMode === 'screen'
      ? 'calc(var(--app-fixed-bottom-edge, 100vh) - var(--app-fixed-top-y, 0px))'
    : backdropMode === 'top'
      ? `calc(${backdropY}px - var(--app-fixed-top-y, 0px))`
      : `${backdropHeight}px`
  const backdropShadowSize = element.backdropShadowSize ?? 90
  const backdropShadowColor = hexToRgba(
    element.backdropShadowColor ?? '#000000',
    element.backdropShadowOpacity ?? 0.24,
  )
  const backdropShadowEndColor = hexToRgba(
    element.backdropShadowEndColor ?? element.backdropShadowColor ?? '#000000',
    element.backdropShadowEndOpacity ?? 0,
  )
  const backdropShadowClass = element.backdropShadow
    ? ` backdrop-shadow backdrop-shadow-${element.backdropShadowEdge === 'bottom' ? 'bottom' : 'top'}`
    : ''
  const backdropShadowStyle = element.backdropShadow
    ? `--backdrop-shadow-size:${backdropShadowSize}px; --backdrop-shadow-start:${backdropShadowColor}; --backdrop-shadow-end:${backdropShadowEndColor};`
    : ''
  const backdropMarkup = element.backdropEnabled
    ? `<div class="element-backdrop screen-width${backdropShadowClass}" aria-hidden="true"${visibilityAttributes} style="top:${backdropTop}; height:${backdropCssHeight}; z-index:${Math.max(0, elementZIndex - 1)}; background:${element.backdropColor ?? '#202124'}; opacity:${element.backdropOpacity ?? 1}; ${element.visible === false || elementIsDelayed ? 'display:none;' : ''} ${backdropShadowStyle} ${element.backdropBlur ? `backdrop-filter:blur(${element.backdropBlur}px); -webkit-backdrop-filter:blur(${element.backdropBlur}px);` : ''}"></div>\n`
    : ''

  if (element.type === 'image') {
    return `${backdropMarkup}<div${visibilityAttributes}${popupAttribute}${nextSceneAttribute}${clickAttribute}${interactionAudioAttribute} class="${classes}" style="${style}">${
      element.src
        ? `<img src="${escapeHtml(element.src)}" alt="${escapeHtml(element.name || 'Image')}" style="object-fit:${element.fit ?? 'contain'}" />`
        : '<span>Image</span>'
    }</div>`
  }

  if (element.type === 'video') {
    const autoplay = element.autoplay ? ' autoplay playsinline' : ''
    const loop = element.loop ? ' loop' : ''
    const muted = element.muted ? ' muted' : ''
    const poster = element.poster ? ` poster="${escapeHtml(element.poster)}"` : ''
    return `${backdropMarkup}<div${visibilityAttributes}${popupAttribute}${nextSceneAttribute}${clickAttribute}${interactionAudioAttribute} class="${classes}" style="${style}">${
      element.src
        ? `<video src="${escapeHtml(element.src)}"${poster}${autoplay}${loop}${muted} style="object-fit:${element.fit ?? 'cover'}"></video>`
        : '<span>Video</span>'
    }</div>`
  }

  const ping = animation === 'ping' ? '<span class="ping" aria-hidden="true"></span>' : ''
  if (element.type === 'button') {
    return `${backdropMarkup}<button${visibilityAttributes}${popupAttribute}${nextSceneAttribute}${interactionAudioAttribute} class="${classes}" style="${style}" type="button"${clickAttribute}>${ping}<span class="element-text-content">${escapeHtml(element.text ?? '')}</span></button>`
  }

  return `${backdropMarkup}<div${visibilityAttributes}${popupAttribute}${nextSceneAttribute}${clickAttribute}${interactionAudioAttribute} class="${classes}" style="${style}">${ping}<span class="element-text-content">${escapeHtml(element.text ?? '')}</span></div>`
}

const endSceneIframeBridgeScript = `<script>(function(){try{if(window.parent&&window.parent!==window){window.mraid=window.parent.mraid||window.mraid;window.clickTag=window.parent.clickTag||window.clickTag;window.clickTag1=window.parent.clickTag1||window.clickTag1;window.clickthrough=window.parent.clickthrough||window.clickthrough;window.clickThrough=window.parent.clickThrough||window.clickThrough;window.isMraidUsable=window.parent.isMraidUsable||window.isMraidUsable;window.handleMraidClick=window.parent.handleMraidClick||window.handleMraidClick;window.getMraidClickTarget=window.parent.getMraidClickTarget||window.getMraidClickTarget}}catch(_error){}})();</script>`

const injectEndSceneIframeBridge = (html = '') => {
  if (!html) return ''

  const cleanHtml = html.replace(
    /<script\b[^>]*\bsrc=["']mraid\.js["'][^>]*>\s*<\/script>/gi,
    '',
  )

  if (cleanHtml.includes('</head>')) {
    return cleanHtml.replace('</head>', `${endSceneIframeBridgeScript}</head>`)
  }

  return `${endSceneIframeBridgeScript}${cleanHtml}`
}

const buildEndSceneMarkup = (endScene) => {
  if (!endScene?.enabled || (!endScene.html && !endScene.src)) return ''

  const animation = endScene.animation || 'slide-right'
  const clickAttribute = ` data-mraid-click="true"${
    endScene.clickUrl ? ` data-link="${escapeHtml(endScene.clickUrl)}"` : ''
  }`
  const frameSourceAttribute = endScene.html
    ? `srcdoc="${escapeHtml(injectEndSceneIframeBridge(endScene.html))}"`
    : `src="${escapeHtml(endScene.src)}"`

  return `
<div class="end-scene-root end-scene-${escapeHtml(animation)}" id="end-scene-root" data-animation="${escapeHtml(animation)}" hidden>
  <iframe
    class="end-scene-frame"
    ${frameSourceAttribute}
    title="${escapeHtml(endScene.name || 'End Scene')}"
    aria-label="${escapeHtml(endScene.name || 'End Scene')}"
  ></iframe>
  <button class="end-scene-click-layer" type="button"${clickAttribute} aria-label="Open store"></button>
</div>`.trim()
}

const buildTemplateMarkup = (settings) => {
  const orientation = settings.canvas.width >= settings.canvas.height ? 'landscape' : 'portrait'
  const sceneElements = getLayerElements(settings, 'scene').map(buildElementMarkup).join('\n    ')
  const overlayElements = getLayerElements(settings, 'overlay').map(buildElementMarkup).join('\n      ')
  const overlay = settings.overlay?.enabled
    ? `<div class="template-overlay-layer" aria-label="Overlay">
      <div class="template-overlay-backdrop" aria-hidden="true"></div>
      ${overlayElements}
    </div>`
    : ''

  return `
<div class="app-wrapper">
  <div class="app ${orientation}" id="app">
    ${sceneElements}
    ${overlay}
  </div>
</div>
${buildEndSceneMarkup(settings.endScene)}`.trim()
}

const mraidInlineHeadMarkup = `<script>(function(){var mraidIsReady=false;var mraidReadyListenerAttached=false;function init(){mraidIsReady=true}function initializeAfterMraidReady(){var mraid=window.mraid;if(!mraid||typeof mraid.getState!=="function"||typeof mraid.addEventListener!=="function"){init();return}try{if(mraid.getState()==="loading"){mraid.addEventListener("ready",init);mraidReadyListenerAttached=true}else{init()}}catch(err){init()}}function trackMraidReadiness(mraid){if(mraidReadyListenerAttached||!mraid||typeof mraid.addEventListener!=="function"){return}try{mraid.addEventListener("ready",function(){mraidIsReady=true});mraidReadyListenerAttached=true}catch(err){}}window.isMraidUsable=function(mraid){if(!mraid)return false;trackMraidReadiness(mraid);if(typeof mraid.getState!=="function"){return true}try{var state=mraid.getState();return state!=="loading"}catch(err){return mraidIsReady}};window.getMraidClickTarget=function(fallbackUrl){return window.clickTag||window.clickTag1||window.clickthrough||window.clickThrough||fallbackUrl||""};window.handleMraidClick=function(fallbackUrl){var clickTarget=window.getMraidClickTarget(fallbackUrl);var mraid=window.mraid;function logMraidOpenFailure(reason,error){if(error){console.warn("[MRAID] mraid.open failed:",reason,error);return}console.warn("[MRAID] mraid.open failed:",reason)}if(!mraid||typeof mraid.open!=="function"){logMraidOpenFailure("mraid.open is unavailable");return}if(!window.isMraidUsable(mraid)){logMraidOpenFailure("MRAID is not ready or usable");return}try{if(clickTarget){mraid.open(clickTarget)}else{mraid.open()}}catch(err){logMraidOpenFailure("mraid.open threw an error",err)}};initializeAfterMraidReady()})();</script>`
const mraidHeadMarkup = mraidInlineHeadMarkup

const buildProjectIndexHtml = (runtime, pageTitle = 'Exported Template') => {
  const body = runtime === 'react'
    ? '<div id="root"></div><script type="module" src="/src/main.jsx"></script>'
    : '<script type="module" src="/src/main.js"></script>'
  const stylesheet = runtime === 'react' ? '' : '<link rel="stylesheet" href="/src/styles.css" />'

  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(pageTitle)}</title>${mraidHeadMarkup}${stylesheet}</head><body>${body}</body></html>\n`
}

const buildRuntimeScript = (settings, options = {}) => {
  const backgroundMusicExpression =
    options.backgroundMusicExpression ?? JSON.stringify(settings.audio?.backgroundMusic || '')

  return `
const app = document.getElementById('app');
const endSceneRoot = document.getElementById('end-scene-root');
const baseWidth = ${settings.canvas.width};
const baseHeight = ${settings.canvas.height};
const scalePosition = '${settings.canvas.scalePosition ?? 'center'}';
const endSceneShowOnLoad = ${Boolean(settings.endScene?.enabled && (settings.endScene?.html || settings.endScene?.src) && settings.endScene?.showOnLoad)};
const endSceneDelayMs = ${Math.max(0, Number(settings.endScene?.delaySeconds ?? 0.95)) * 1000};
const resolveRuntimeAsset = (value) => {
  if (typeof resolveAssetUrl === 'function') return resolveAssetUrl(value);
  return value;
};
const backgroundMusicSrc = resolveRuntimeAsset(${backgroundMusicExpression});
const backgroundMusicVolume = ${Math.min(Math.max(Number(settings.audio?.backgroundVolume ?? 0.55) || 0, 0), 1)};
const backgroundMusicLoop = ${Boolean(settings.audio?.backgroundLoop ?? true)};
let creativeInitialized = false;
let mraidClickListenersAttached = false;
let nextSceneClickListenersAttached = false;
let firstInteractionAudioStarted = false;
let backgroundMusicAudio = null;
let endSceneVisible = false;

function scaleApp() {
  const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;
  const bleed = 6 / scale;
  const offsetTop = scalePosition === 'top'
    ? 0
    : scalePosition === 'bottom'
      ? window.innerHeight - scaledHeight
      : (window.innerHeight - scaledHeight) / 2;
  const offsetLeft = Math.round((window.innerWidth - scaledWidth) / 2);
  const snappedOffsetTop = Math.round(offsetTop);
  app.style.transform = 'scale(' + scale + ')';
  app.style.setProperty('--app-scale', scale);
  app.style.setProperty('--app-offset-top', snappedOffsetTop + 'px');
  app.style.setProperty('--app-screen-width', (window.innerWidth / scale + bleed * 2) + 'px');
  app.style.setProperty('--app-fixed-top-y', (-snappedOffsetTop / scale) + 'px');
  app.style.setProperty('--app-fixed-bottom-edge', ((window.innerHeight - snappedOffsetTop) / scale) + 'px');
  app.style.left = offsetLeft + 'px';
  app.style.top = snappedOffsetTop + 'px';
}

function getClickTarget(url) {
  return window.clickTag ||
    window.clickTag1 ||
    window.clickthrough ||
    window.clickThrough ||
    url ||
    '';
}

function getMraidOpenFailureReason(mraid) {
  if (!mraid) return 'MRAID object is unavailable';
  if (typeof mraid.open !== 'function') return 'mraid.open is unavailable';

  return '';
}

function logMraidOpenFailure(reason, err) {
  if (err) {
    console.warn('[MRAID] mraid.open failed to execute: ' + reason, err);
    return;
  }

  console.warn('[MRAID] mraid.open failed to execute: ' + reason);
}

function openStore(url) {
  if (typeof window.handleMraidClick === 'function') {
    window.handleMraidClick(url);
    return;
  }

  const mraid = window.mraid;
  const clickTarget = getClickTarget(url);
  const failureReason = getMraidOpenFailureReason(mraid);

  if (failureReason) {
    logMraidOpenFailure(failureReason);
    return;
  }

  try {
    if (clickTarget) {
      mraid.open(clickTarget);
    } else {
      mraid.open();
    }
  } catch (err) {
    logMraidOpenFailure('mraid.open threw an exception', err);
  }
}

function createAudio(src, volume, loop) {
  if (!src) return null;

  try {
    const audio = new Audio(src);
    audio.volume = Math.min(Math.max(Number(volume) || 0, 0), 1);
    audio.loop = Boolean(loop);
    audio.preload = 'auto';
    return audio;
  } catch (err) {
    console.warn('[Audio] Could not create audio.', err);
    return null;
  }
}

function playAudioInstance(audio, label) {
  if (!audio) return;

  try {
    audio.currentTime = 0;
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch((err) => console.warn('[Audio] ' + label + ' failed to play.', err));
    }
  } catch (err) {
    console.warn('[Audio] ' + label + ' failed to play.', err);
  }
}

function playOneShotAudio(src, volume, label) {
  const audio = createAudio(src, volume, false);
  playAudioInstance(audio, label);
}

function startBackgroundMusicOnce() {
  if (firstInteractionAudioStarted) return;
  firstInteractionAudioStarted = true;
  if (endSceneVisible) return;
  if (!backgroundMusicSrc) return;

  backgroundMusicAudio = createAudio(backgroundMusicSrc, backgroundMusicVolume, backgroundMusicLoop);
  playAudioInstance(backgroundMusicAudio, 'Background music');
}

function stopBackgroundMusic() {
  if (!backgroundMusicAudio) return;
  backgroundMusicAudio.pause();
  backgroundMusicAudio.currentTime = 0;
}

function handleFirstInteractionAudio() {
  startBackgroundMusicOnce();
}

function playInteractionSfx(element) {
  handleFirstInteractionAudio();
  const src = element?.dataset?.interactionSfx || '';
  const volume = Number(element?.dataset?.interactionVolume ?? 1);
  playOneShotAudio(src, volume, 'Interaction SFX');
}

function playSceneChangeSfx(src, volume) {
  playOneShotAudio(src || '', Number(volume ?? 1), 'Scene change SFX');
}

window.handleFirstInteractionAudio = handleFirstInteractionAudio;
window.playInteractionSfx = playInteractionSfx;
window.playSceneChangeSfx = playSceneChangeSfx;

function setupMraidViewability() {
  const mraid = window.mraid;
  if (!mraid) return;

  function handleViewableChange(viewable) {
    if (!viewable) {
      document.querySelectorAll('video, audio').forEach((element) => {
        element.pause();
      });
      if (backgroundMusicAudio) backgroundMusicAudio.pause();
    } else if (backgroundMusicAudio && firstInteractionAudioStarted && !endSceneVisible) {
      const playResult = backgroundMusicAudio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch((err) => console.warn('[Audio] Background music resume failed.', err));
      }
    }
  }

  if (typeof mraid.isViewable === 'function') {
    handleViewableChange(mraid.isViewable());
  }

  if (typeof mraid.addEventListener === 'function') {
    mraid.addEventListener('viewableChange', handleViewableChange);
  }
}

function setupMraidClicks() {
  if (mraidClickListenersAttached) return;
  mraidClickListenersAttached = true;

  const handleOpen = (event) => {
    const element = event.target.closest?.('[data-mraid-click="true"]');
    if (!element) return;

    const now = Date.now();
    const lastOpenAt = Number(element.dataset.lastMraidOpenAt || 0);
    if (now - lastOpenAt < 650) return;
    element.dataset.lastMraidOpenAt = String(now);

    event.preventDefault();
    event.stopPropagation();
    playInteractionSfx(element);
    openStore(element.dataset.link);
  };

  document.addEventListener('pointerup', handleOpen);
  document.addEventListener('touchend', handleOpen, { passive: false });
  document.addEventListener('click', handleOpen);
}

function setupNextSceneClicks() {
  if (nextSceneClickListenersAttached) return;
  nextSceneClickListenersAttached = true;

  const handleNextScene = (event) => {
    const element = event.target.closest?.('[data-next-scene-click="true"]');
    if (!element) return;

    const now = Date.now();
    const lastOpenAt = Number(element.dataset.lastNextSceneAt || 0);
    if (now - lastOpenAt < 500) return;
    element.dataset.lastNextSceneAt = String(now);

    event.preventDefault();
    event.stopPropagation();
    playInteractionSfx(element);
    if (typeof window.showSceneTarget === 'function') {
      window.showSceneTarget(element.dataset.sceneTarget || 'next');
    } else if (typeof window.nextScene === 'function') {
      window.nextScene(element.dataset.sceneTarget || 'next');
    }
  };

  document.addEventListener('pointerup', handleNextScene);
  document.addEventListener('touchend', handleNextScene, { passive: false });
  document.addEventListener('click', handleNextScene);
}

function setupTimedElements() {
  document.querySelectorAll('[data-show-after]').forEach((element) => {
    const delayMs = Math.max(0, Number(element.dataset.showAfter || 0) || 0) * 1000;
    const animation = element.dataset.entranceAnimation || 'fade';

    element.style.display = 'none';
    window.setTimeout(() => {
      element.style.display = '';
      if (animation && animation !== 'none') {
        const className = 'entrance-' + animation;
        element.classList.add(className);
        element.addEventListener('animationend', () => {
          element.classList.remove(className);
        }, { once: true });
      }
    }, delayMs);
  });
}

function showEndScene() {
  endSceneVisible = true;
  stopBackgroundMusic();
  if (!endSceneRoot) return;
  endSceneRoot.hidden = false;
  endSceneRoot.removeAttribute('hidden');
}

function hideEndScene() {
  if (!endSceneRoot) return;
  endSceneVisible = false;
  endSceneRoot.hidden = true;
  endSceneRoot.setAttribute('hidden', '');
}

window.showEndScene = showEndScene;
window.hideEndScene = hideEndScene;
window.resetTimedElements = setupTimedElements;

function initializeCreative() {
  if (creativeInitialized) return;
  creativeInitialized = true;

  window.addEventListener('resize', scaleApp);
  window.addEventListener('orientationchange', scaleApp);
  setupMraidClicks();
  setupNextSceneClicks();
  setupMraidViewability();
  setupTimedElements();
  if (endSceneShowOnLoad) window.setTimeout(showEndScene, endSceneDelayMs);
}

function initializeWhenMraidReady() {
  const mraid = window.mraid;

  if (
    !mraid ||
    typeof mraid.getState !== 'function' ||
    typeof mraid.addEventListener !== 'function'
  ) {
    initializeCreative();
    return;
  }

  try {
    if (mraid.getState() === 'loading') {
      mraid.addEventListener('ready', initializeCreative);
      return;
    }
  } catch (err) {}

  initializeCreative();
}

scaleApp();
initializeWhenMraidReady();
`.trim()
}

const buildSingleHtml = (settings, pageTitle = 'Exported Template') => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    ${mraidHeadMarkup}
    <style>${buildTemplateCss(settings)}</style>
  </head>
  <body>
    ${buildTemplateMarkup(settings)}
    ${buildTemplateDataScript(settings)}
    <script>${buildRuntimeScript(settings)}</script>
  </body>
</html>
`

const buildProjectAssetResolver = (assetPathPrefix = './assets') => `const assetUrls = import.meta.glob('${assetPathPrefix}/**/*', { eager: true, query: '?url', import: 'default' })

const resolveAssetUrl = (value) => {
  if (!value || /^(?:data:|https?:|blob:|\\/)/i.test(value)) return value

  const normalized = value.startsWith('./') ? value : \`./\${value.replace(/^\\/+/, '')}\`
  const relativeAsset = normalized.replace(/^\\.\\/assets\\//, '').replace(/^\\.\\//, '')
  return assetUrls[normalized]
    ?? assetUrls[\`${assetPathPrefix}/\${relativeAsset}\`]
    ?? assetUrls[\`${assetPathPrefix}/\${normalized.split('/').pop()}\`]
    ?? value
}
`

const projectAssetDomResolver = `function resolveInsertedAssetUrls() {
  document.querySelectorAll('[src]').forEach((element) => {
    const value = element.getAttribute('src')
    const resolved = resolveAssetUrl(value)
    if (resolved !== value) element.setAttribute('src', resolved)
  })

  document.querySelectorAll('[poster]').forEach((element) => {
    const value = element.getAttribute('poster')
    const resolved = resolveAssetUrl(value)
    if (resolved !== value) element.setAttribute('poster', resolved)
  })

  document.querySelectorAll('[data-interaction-sfx]').forEach((element) => {
    const value = element.getAttribute('data-interaction-sfx')
    const resolved = resolveAssetUrl(value)
    if (resolved !== value) element.setAttribute('data-interaction-sfx', resolved)
  })
}
`

const buildReactStyle = (element) => {
  const entries = [
    ['top', element.y],
    ['height', element.height],
    ['zIndex', element.alwaysVisible || element.popupEnabled ? 9999 : element.zIndex ?? 1],
    ['borderRadius', element.radius ?? 0],
    ['color', element.color ?? '#374151'],
    ['fontSize', element.size ?? 22],
    ['fontWeight', element.fontWeight ?? 800],
    ['textAlign', element.align ?? 'center'],
    ['transform', `rotate(${Number(element.rotation ?? 0) || 0}deg)`],
    ['transformOrigin', 'center center'],
    ['--element-height', `${element.height}px`],
    ['--element-animation-speed', `${element.speed ?? 1.35}s`],
  ]

  if (!['image', 'video', 'text', 'hotspot'].includes(element.type)) {
    entries.push(['background', element.background])
  }

  if (element.visible === false || getElementDelaySeconds(element) > 0) {
    entries.push(['display', 'none'])
  }

  if (!element.fullWidth) {
    entries.push(['left', element.x], ['width', element.width])
  }

  return `{{ ${entries
    .map(([key, value]) => {
      const property = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
      const propertyValue = typeof value === 'number' ? value : JSON.stringify(value)
      return `${property}: ${propertyValue}`
    })
    .join(', ')} }}`
}

const buildReactClassName = (element) => [
  'absolute',
  'box-border',
  'grid',
  'place-items-center',
  'overflow-hidden',
  'leading-[1.15]',
  'whitespace-pre-line',
  'template-element',
  getElementRole(element) === 'header' ? 'template-header' : '',
  getElementRole(element) === 'cta' ? 'template-cta' : '',
  `role-${getElementRole(element)}`,
  `element-${element.type}`,
  `align-${element.align ?? 'center'}`,
  `animation-${element.animation ?? 'none'}`,
  element.type === 'image' || element.type === 'video' || element.type === 'text' || element.type === 'hotspot' ? 'p-0' : 'px-3',
  element.type === 'button' ? 'border-0 cursor-pointer' : '',
  element.fullWidth ? 'screen-width' : '',
  element.fixedTop ? 'fixed-top' : '',
  element.fixedBottom ? 'fixed-bottom' : '',
  element.popupEnabled ? 'popup-element' : '',
].filter(Boolean).join(' ')

const indentLines = (value, spaces) =>
  value.split('\n').map((line) => `${' '.repeat(spaces)}${line}`).join('\n')

const getExportSceneSettings = (settings) =>
  Array.isArray(settings.scenes) && settings.scenes.length > 0
    ? settings.scenes.map((scene) => normalizeTemplateSettings(scene.settings ?? settings))
    : [normalizeTemplateSettings(settings)]

const getSceneComponentName = (index) => `Scene${index + 1}`

const isProjectLocalAsset = (value) =>
  Boolean(value) && !/^(?:data:|https?:|blob:|\/)/i.test(value)

const createReactAssetContext = (values, importPrefix) => {
  const imports = []
  const importMap = new Map()

  const toImportPath = (value) => {
    const clean = String(value || '').replace(/^\.?\//, '').replace(/^src\//, '')
    if (clean.startsWith('assets/')) return `${importPrefix}/${clean.slice('assets/'.length)}`
    return `${importPrefix}/${clean}`
  }

  const get = (value) => {
    if (!value) return JSON.stringify('')
    if (!isProjectLocalAsset(value)) return JSON.stringify(value)

    if (!importMap.has(value)) {
      const name = `asset${importMap.size + 1}`
      importMap.set(value, name)
      imports.push(`import ${name} from ${JSON.stringify(toImportPath(value))}`)
    }

    return importMap.get(value)
  }

  values.filter(Boolean).forEach(get)

  return {
    get,
    imports: imports.join('\n'),
  }
}

const getSceneAssetValues = (sceneSettings) =>
  getElements(sceneSettings)
    .flatMap((element) => [element.src, element.poster, element.interactionSfx])
    .filter(Boolean)

const buildReactElement = (element, assets) => {
  const className = JSON.stringify(buildReactClassName(element))
  const style = buildReactStyle(element)
  const elementZIndex = element.alwaysVisible || element.popupEnabled ? 9999 : element.zIndex ?? 1
  const elementDelay = getElementDelaySeconds(element)
  const elementIsDelayed = element.visible !== false && elementDelay > 0
  const timingAttributes = elementIsDelayed
    ? `\n        data-show-after={${JSON.stringify(elementDelay)}}\n        data-entrance-animation={${JSON.stringify(element.entranceAnimation ?? 'fade')}}`
    : ''
  const popupAttribute = element.popupEnabled ? '\n        data-popup-element="true"' : ''
  const nextSceneAttribute = element.nextSceneClick
    ? `\n        data-next-scene-click="true"\n        data-scene-target=${JSON.stringify(element.nextSceneTarget || 'next')}`
    : ''
  const clickAttribute = element.mraidClick || getElementRole(element) === 'cta'
    ? ` data-mraid-click="true"${element.link ? ` data-link=${JSON.stringify(element.link)}` : ''}`
    : ''
  const interactionAudioAttribute = element.interactionSfx
    ? `\n        data-interaction-sfx={${assets.get(element.interactionSfx)}}\n        data-interaction-volume=${JSON.stringify(String(Math.min(Math.max(Number(element.interactionVolume ?? 1) || 0, 0), 1)))}`
    : ''
  const ping = element.animation === 'ping'
    ? '\n        <span className="ping absolute inset-0 rounded-[inherit] bg-white/25" aria-hidden="true" />'
    : ''
  const backdropHeight = element.backdropHeight ?? element.height
  const backdropY = Number.isFinite(Number(element.backdropY))
    ? Number(element.backdropY)
    : Math.round(element.y + element.height / 2 - backdropHeight / 2)
  const backdropMode = element.backdropPosition ?? 'element'
  const backdropTop = backdropMode === 'top'
    ? 'var(--app-fixed-top-y, 0px)'
    : backdropMode === 'screen'
      ? 'var(--app-fixed-top-y, 0px)'
    : `${backdropY}px`
  const backdropCssHeight = backdropMode === 'bottom'
    ? `calc(var(--app-fixed-bottom-edge, ${element.y + element.height}px) - ${backdropY}px)`
    : backdropMode === 'screen'
      ? 'calc(var(--app-fixed-bottom-edge, 100vh) - var(--app-fixed-top-y, 0px))'
    : backdropMode === 'top'
      ? `calc(${backdropY}px - var(--app-fixed-top-y, 0px))`
      : backdropHeight
  const backdropShadowSize = element.backdropShadowSize ?? 90
  const backdropShadowColor = hexToRgba(
    element.backdropShadowColor ?? '#000000',
    element.backdropShadowOpacity ?? 0.24,
  )
  const backdropShadowEndColor = hexToRgba(
    element.backdropShadowEndColor ?? element.backdropShadowColor ?? '#000000',
    element.backdropShadowEndOpacity ?? 0,
  )
  const backdropClassName = element.backdropShadow
    ? `element-backdrop screen-width backdrop-shadow backdrop-shadow-${element.backdropShadowEdge === 'bottom' ? 'bottom' : 'top'}`
    : 'element-backdrop screen-width'
  const backdrop = element.backdropEnabled
    ? `<div
        className=${JSON.stringify(backdropClassName)}
        aria-hidden="true"
        style={{
          top: ${JSON.stringify(backdropTop)},
          height: ${typeof backdropCssHeight === 'number' ? backdropCssHeight : JSON.stringify(backdropCssHeight)},
          zIndex: ${Math.max(0, elementZIndex - 1)},
          background: ${JSON.stringify(element.backdropColor ?? '#202124')},
          opacity: ${element.backdropOpacity ?? 1},
          display: ${element.visible === false || elementIsDelayed ? JSON.stringify('none') : 'undefined'},
          '--backdrop-shadow-size': ${element.backdropShadow ? JSON.stringify(`${backdropShadowSize}px`) : 'undefined'},
          '--backdrop-shadow-start': ${element.backdropShadow ? JSON.stringify(backdropShadowColor) : 'undefined'},
          '--backdrop-shadow-end': ${element.backdropShadow ? JSON.stringify(backdropShadowEndColor) : 'undefined'},
          backdropFilter: ${element.backdropBlur ? JSON.stringify(`blur(${element.backdropBlur}px)`) : 'undefined'},
          WebkitBackdropFilter: ${element.backdropBlur ? JSON.stringify(`blur(${element.backdropBlur}px)`) : 'undefined'},
        }}
        ${timingAttributes.trim()}
      />
      `
    : ''

  if (element.type === 'image') {
    const src = assets.get(element.src)
    const content = element.src
      ? `<img className="block h-full w-full pointer-events-none" src={${src}} alt=${JSON.stringify(element.name || 'Image')} style={{ objectFit: ${JSON.stringify(element.fit ?? 'contain')} }} />`
      : '<span>Image</span>'

    return `${backdrop}<div${timingAttributes}${popupAttribute}${nextSceneAttribute}${clickAttribute}${interactionAudioAttribute} className=${className} style=${style}>
        ${content}
      </div>`
  }

  if (element.type === 'video') {
    const src = assets.get(element.src)
    const poster = element.poster ? `\n          poster={${assets.get(element.poster)}}` : ''
    const content = element.src
      ? `<video
          className="block h-full w-full pointer-events-none"
          src={${src}}${poster}
          ${element.autoplay ? 'autoPlay' : ''}
          ${element.loop ? 'loop' : ''}
          ${element.muted ? 'muted' : ''}
          playsInline
          style={{ objectFit: ${JSON.stringify(element.fit ?? 'cover')} }}
        />`
      : '<span>Video</span>'

    return `${backdrop}<div${timingAttributes}${popupAttribute}${nextSceneAttribute}${clickAttribute}${interactionAudioAttribute} className=${className} style=${style}>
        ${content}
      </div>`
  }

  if (element.type === 'button') {
    return `${backdrop}<button${timingAttributes}${popupAttribute}${nextSceneAttribute}${clickAttribute}${interactionAudioAttribute} className=${className} style=${style} type="button">${ping}
        <span className="element-text-content relative max-w-full overflow-hidden text-ellipsis">{${JSON.stringify(element.text ?? '')}}</span>
      </button>`
  }

  return `${backdrop}<div${timingAttributes}${popupAttribute}${nextSceneAttribute}${clickAttribute}${interactionAudioAttribute} className=${className} style=${style}>${ping}
        <span className="element-text-content relative max-w-full overflow-hidden text-ellipsis">{${JSON.stringify(element.text ?? '')}}</span>
      </div>`
}

const buildReactSceneComponent = (sceneSettings, index) => {
  const assets = createReactAssetContext(getSceneAssetValues(sceneSettings), '../assets')
  const sceneElements = getLayerElements(sceneSettings, 'scene')
    .map((element) => indentLines(buildReactElement(element, assets), 8))
    .join('\n')
  const overlayElements = getLayerElements(sceneSettings, 'overlay')
    .map((element) => indentLines(buildReactElement(element, assets), 10))
    .join('\n')
  const overlay = sceneSettings.overlay?.enabled
    ? `        <div className="template-overlay-layer" aria-label="Overlay">
          <div className="template-overlay-backdrop" aria-hidden="true" />
${overlayElements}
        </div>
`
    : ''

  return `${assets.imports ? `${assets.imports}\n\n` : ''}

export default function ${getSceneComponentName(index)}() {
  return (
    <>
${sceneElements}
${overlay}
    </>
  )
}
`
}

const buildReactEndSceneComponent = (endScene) => {
  const normalizedEndScene = cloneEndScene(endScene)
  const animation = normalizedEndScene.animation || 'slide-right'
  const localHtmlSource = normalizedEndScene.src
    && !/^(?:data:|https?:|blob:|\/)/i.test(normalizedEndScene.src)
    && /\.html?(?:$|[?#])/i.test(normalizedEndScene.src)
  const hasInlineHtml = Boolean(normalizedEndScene.html)
  const assets = createReactAssetContext(localHtmlSource || hasInlineHtml ? [] : [normalizedEndScene.src], './assets')
  const htmlImportPath = localHtmlSource
    ? `${normalizedEndScene.src.startsWith('./') ? normalizedEndScene.src : `./${normalizedEndScene.src.replace(/^\/+/, '')}`}?url`
    : ''
  const inlineHtmlExpression = JSON.stringify(cleanEndSceneHtmlForExport(normalizedEndScene.html || ''))
  const frameSourceExpression = localHtmlSource
    ? 'sourceEndSceneUrl'
    : hasInlineHtml
      ? 'htmlToDataUrl(cleanEndSceneHtml(inlineEndSceneHtml))'
      : assets.get(normalizedEndScene.src)

  return `import { useCallback, useRef } from 'react'
${localHtmlSource ? `import sourceEndSceneUrl from ${JSON.stringify(htmlImportPath)}\n` : ''}${!localHtmlSource && !hasInlineHtml && assets.imports ? `${assets.imports}\n` : ''}
const inlineEndSceneHtml = ${hasInlineHtml && !localHtmlSource ? inlineHtmlExpression : "''"}
const endSceneFrameSrc = ${frameSourceExpression}
const clickUrl = ${JSON.stringify(normalizedEndScene.clickUrl || '')}

function getClickTarget(fallbackUrl = '') {
  return window.clickTag
    || window.clickTag1
    || window.clickthrough
    || window.clickThrough
    || fallbackUrl
    || ''
}

function logMraidOpenFailure(reason, error) {
  if (error) {
    console.warn('[MRAID] mraid.open failed:', reason, error)
    return
  }

  console.warn('[MRAID] mraid.open failed:', reason)
}

function handleMraidClickOnly(fallbackUrl = '') {
  const mraid = window.mraid
  const clickTarget = getClickTarget(fallbackUrl)

  if (!mraid || typeof mraid.open !== 'function') {
    logMraidOpenFailure('mraid.open is unavailable')
    return
  }

  if (typeof window.isMraidUsable === 'function' && !window.isMraidUsable(mraid)) {
    logMraidOpenFailure('MRAID is not ready or usable')
    return
  }

  try {
    if (clickTarget) {
      mraid.open(clickTarget)
    } else {
      mraid.open()
    }
  } catch (error) {
    logMraidOpenFailure('mraid.open threw an error', error)
  }
}

function cleanEndSceneHtml(html) {
  return String(html || '')
    .replace(/<script\\b[^>]*\\bsrc=["']mraid\\.js["'][^>]*>\\s*<\\/script>/gi, '')
}

function htmlToDataUrl(html) {
  const bytes = new TextEncoder().encode(html)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return 'data:text/html;base64,' + btoa(binary)
}

export default function EndScene() {
  const lastClickAtRef = useRef(0)
  const handleEndSceneClick = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()

    const now = Date.now()
    if (now - lastClickAtRef.current < 650) return
    lastClickAtRef.current = now

    if (typeof window.handleMraidClick === 'function') {
      window.handleMraidClick(clickUrl)
      return
    }

    handleMraidClickOnly(clickUrl)
  }, [])

  return (
    <div
      className=${JSON.stringify(`end-scene-root end-scene-${animation}`)}
      id="end-scene-root"
      data-animation={${JSON.stringify(animation)}}
      hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
      }}
    >
      <iframe
        className="end-scene-frame"
        src={endSceneFrameSrc}
        title={${JSON.stringify(normalizedEndScene.name || 'End Scene')}}
        aria-label={${JSON.stringify(normalizedEndScene.name || 'End Scene')}}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          width: '100vw',
          height: '100vh',
          border: 0,
          background: '#000000',
          pointerEvents: 'none',
        }}
      />
      <button
        className="end-scene-click-layer"
        type="button"
        onClick={handleEndSceneClick}
        onPointerDown={handleEndSceneClick}
        aria-label="Open store"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          width: '100vw',
          height: '100vh',
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      />
    </div>
  )
}
`
}

const buildReactComponent = (settings) => {
  const orientation = settings.canvas.width >= settings.canvas.height ? 'landscape' : 'portrait'
  const sceneSettings = getExportSceneSettings(settings)
  const audioAssets = createReactAssetContext(
    [
      settings.audio?.backgroundMusic,
      ...(settings.scenes ?? []).map((scene) => scene.sceneChangeSfx),
    ],
    './assets',
  )
  const script = buildRuntimeScript(settings, {
    backgroundMusicExpression: audioAssets.get(settings.audio?.backgroundMusic),
  })
  const sceneImports = sceneSettings
    .map((_, index) => `import ${getSceneComponentName(index)} from './scenes/${getSceneComponentName(index)}.jsx'`)
    .join('\n')
  const shouldRenderEndScene = Boolean(settings.endScene?.enabled && (settings.endScene?.html || settings.endScene?.src))
  const endSceneImport = shouldRenderEndScene ? "\nimport EndScene from './endscene.jsx'" : ''
  const sceneArray = `[${sceneSettings.map((_, index) => getSceneComponentName(index)).join(', ')}]`
  const sceneMetadata = `[${sceneSettings.map((_, index) => {
      const sourceScene = settings.scenes?.[index] ?? {}

      return `{
  id: ${JSON.stringify(sourceScene.id || `scene-${index + 1}`)},
  startScene: ${JSON.stringify(sourceScene.startScene ?? index === 0)},
  autoShowNext: ${JSON.stringify(getSceneAutoShowNext(sourceScene))},
  showAfterSeconds: ${JSON.stringify(getSceneDelaySeconds(sourceScene, 0))},
  sceneChangeSfx: ${audioAssets.get(sourceScene.sceneChangeSfx)},
  sceneChangeVolume: ${JSON.stringify(Math.min(Math.max(Number(sourceScene.sceneChangeVolume ?? 1) || 0, 0), 1))},
}`
    }).join(', ')}]`
  return `import { useEffect, useRef, useState } from 'react'
import './styles.css'
${sceneImports}${endSceneImport}${audioAssets.imports ? `\n${audioAssets.imports}` : ''}

const scenes = ${sceneArray}
const sceneMetadata = ${sceneMetadata}
const firstSceneIndex = Math.max(0, sceneMetadata.findIndex((scene) => scene.startScene))

export default function App() {
  const [activeScene, setActiveScene] = useState(firstSceneIndex)
  const activeSceneRef = useRef(firstSceneIndex)
  const ActiveScene = scenes[activeScene] ?? scenes[0]

  useEffect(() => {
    ${script.split('\n').join('\n    ')}
  }, [])

  useEffect(() => {
    activeSceneRef.current = activeScene
  }, [activeScene])

  useEffect(() => {
    const playCurrentSceneChangeSfx = (currentIndex = activeSceneRef.current) => {
      const currentScene = sceneMetadata[currentIndex]
      window.playSceneChangeSfx?.(currentScene?.sceneChangeSfx, currentScene?.sceneChangeVolume)
    }

    const showSceneIndex = (nextIndex) => {
      if (Number.isInteger(nextIndex) && nextIndex >= 0 && nextIndex < scenes.length) {
        setActiveScene((current) => {
          if (current !== nextIndex) playCurrentSceneChangeSfx(current)
          return nextIndex
        })
        return true
      }

      return false
    }

    window.showScene = (sceneNumber) => {
      const nextIndex = Number(sceneNumber) - 1
      showSceneIndex(nextIndex)
    }
    window.showSceneTarget = (target = 'next') => {
      if (target === 'end-scene') {
        playCurrentSceneChangeSfx()
        window.showEndScene?.()
        return
      }

      if (target === 'next') {
        window.nextScene()
        return
      }

      const nextIndex = sceneMetadata.findIndex((scene) => scene.id === target)
      showSceneIndex(nextIndex)
    }
    window.nextScene = (target = 'next') => {
      if (target && target !== 'next') {
        window.showSceneTarget(target)
        return
      }

      setActiveScene((current) => {
        if (current >= scenes.length - 1) {
          playCurrentSceneChangeSfx(current)
          window.showEndScene?.()
          return current
        }

        playCurrentSceneChangeSfx(current)
        return current + 1
      })
    }
    window.previousScene = () => {
      setActiveScene((current) => Math.max(current - 1, 0))
    }

    return () => {
      delete window.showScene
      delete window.showSceneTarget
      delete window.nextScene
      delete window.previousScene
    }
  }, [])

  useEffect(() => {
    window.resetTimedElements?.()
  }, [activeScene])

  useEffect(() => {
    const currentScene = sceneMetadata[activeScene]
    if (!currentScene?.autoShowNext) return undefined

    const nextIndex = activeScene + 1
    const delayMs = Math.max(0, Number(currentScene.showAfterSeconds ?? 0) || 0) * 1000
    const timerId = window.setTimeout(() => {
      if (scenes[nextIndex]) {
        window.playSceneChangeSfx?.(currentScene.sceneChangeSfx, currentScene.sceneChangeVolume)
        setActiveScene(nextIndex)
        return
      }

      window.playSceneChangeSfx?.(currentScene.sceneChangeSfx, currentScene.sceneChangeVolume)
      window.showEndScene?.()
    }, delayMs)

    return () => window.clearTimeout(timerId)
  }, [activeScene])

  return (
    <>
      <div className="app-wrapper fixed inset-0 overflow-hidden">
        <div className=${JSON.stringify(`app ${orientation} absolute overflow-visible origin-top-left`)} id="app">
          <ActiveScene />
        </div>
      </div>
${shouldRenderEndScene ? '      <EndScene />' : ''}
    </>
  )
}
`
}

const buildReactViteConfig = () => `import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

function sanitizePlayableHtml() {
  return {
    name: 'sanitize-playable-html',
    apply: 'build',
    writeBundle(options) {
      const outputDirectory = typeof options.dir === 'string' ? options.dir : 'dist'
      const htmlPath = resolve(outputDirectory, 'index.html')
      let source = readFileSync(htmlPath, 'utf8')

      source = source
        .replace(/<script\\b[^>]*\\bsrc=["']mraid\\.js["'][^>]*>\\s*<\\/script>/gi, '')
        .replace(/<link\\b[^>]*\\brel=["']modulepreload["'][^>]*>/gi, '')
        .replace(/<!--[\\s\\S]*?-->/g, '')

      const checks = [
        ['window.open', /window\\.open\\s*\\(/i],
        ['fetch(', /\\bfetch\\s*\\(/i],
        ['mraid.js', /mraid\\.js/i],
        ['local asset path', /(?:src|href|poster)=["'][^"']*(?:\\.\\.\\/|\\.\\/|src\\/|public\\/|assets\\/)|["'](?:\\.\\.\\/|\\.\\/|src\\/|public\\/)?assets\\//i],
        ['external media path', /(?:src|href|poster)=["'][^"']*\\.(?:webp|png|jpe?g|gif|svg|mp3|mp4|webm|wav)\\b/i],
      ]
      const failures = checks
        .filter(([, pattern]) => pattern.test(source))
        .map(([label, pattern]) => {
          const match = source.match(pattern)
          const index = match?.index ?? 0
          const excerpt = source.slice(Math.max(0, index - 80), index + 120)
          return \`\${label}: ...\${excerpt}...\`
        })

      if (failures.length > 0) {
        throw new Error(
          [
            'Final HTML still contains validator-rejected external resource markers.',
            ...failures,
          ].join('\\n'),
        )
      }

      writeFileSync(htmlPath, source)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), sanitizePlayableHtml()],
  build: {
    modulePreload: { polyfill: false },
    assetsInlineLimit: 100 * 1024 * 1024,
  },
})
`

const buildProjectFiles = (settings, runtime, pageTitle = 'Exported Template') => {
  const packageJson = {
    name: 'exported-template',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: runtime === 'react'
      ? {
          '@tailwindcss/vite': '^4.1.17',
          '@vitejs/plugin-react': '^6.0.2',
          tailwindcss: '^4.1.17',
          vite: '^8.1.0',
          'vite-plugin-singlefile': '^2.3.3',
          react: '^19.2.7',
          'react-dom': '^19.2.7',
        }
      : { vite: '^8.1.0' },
  }

  if (runtime === 'react') {
    const sceneSettings = getExportSceneSettings(settings)
    const shouldRenderEndScene = Boolean(settings.endScene?.enabled && (settings.endScene?.html || settings.endScene?.src))

    return [
      { path: 'package.json', content: JSON.stringify(packageJson, null, 2) },
      { path: 'src/template.json', content: `${serializeTemplateSettings(settings)}\n` },
      { path: 'index.html', content: buildProjectIndexHtml(runtime, pageTitle) },
      { path: 'vite.config.js', content: buildReactViteConfig() },
      { path: 'src/main.jsx', content: "import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App.jsx'\n\ncreateRoot(document.getElementById('root')).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n" },
      { path: 'src/App.jsx', content: buildReactComponent(settings) },
      ...(shouldRenderEndScene
        ? [{ path: 'src/endscene.jsx', content: buildReactEndSceneComponent(settings.endScene) }]
        : []),
      ...sceneSettings.map((sceneSetting, index) => ({
        path: `src/scenes/${getSceneComponentName(index)}.jsx`,
        content: buildReactSceneComponent(sceneSetting, index),
      })),
      { path: 'src/styles.css', content: `@import "tailwindcss";\n\n${buildTemplateCss(settings)}\n` },
    ]
  }

  return [
    { path: 'package.json', content: JSON.stringify(packageJson, null, 2) },
    { path: 'src/template.json', content: `${serializeTemplateSettings(settings)}\n` },
    { path: 'index.html', content: buildProjectIndexHtml(runtime, pageTitle) },
    { path: 'src/main.js', content: `${buildProjectAssetResolver()}\n${projectAssetDomResolver}\ndocument.body.insertAdjacentHTML('beforeend', ${JSON.stringify(buildTemplateMarkup(settings))})\nresolveInsertedAssetUrls()\n\n${buildRuntimeScript(settings)}\n` },
    { path: 'src/styles.css', content: buildTemplateCss(settings) },
  ]
}

function NumberControl({ label, min, max, step = 1, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function ColorControl({ label, value, onChange }) {
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'

  return (
    <label className="field field-color">
      <span>{label}</span>
      <input
        type="text"
        placeholder="#ffffff"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        type="color"
        value={pickerValue}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TextControl({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function CheckboxControl({ label, checked, onChange }) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

const fileMatchesAccept = (file, accept = '') => {
  if (!accept) return true

  return accept.split(',').some((rule) => {
    const cleanRule = rule.trim().toLowerCase()
    if (!cleanRule) return false
    if (cleanRule.startsWith('.')) return file.name.toLowerCase().endsWith(cleanRule)
    if (cleanRule.endsWith('/*')) return file.type.toLowerCase().startsWith(cleanRule.slice(0, -1))
    return file.type.toLowerCase() === cleanRule
  })
}

const assetMatchesAccept = (asset, accept = '') => {
  if (!accept || !asset?.type) return true

  return accept.split(',').some((rule) => {
    const cleanRule = rule.trim().toLowerCase()
    if (!cleanRule || cleanRule.startsWith('.')) return false
    if (cleanRule.endsWith('/*')) return `${asset.type}/`.startsWith(cleanRule.slice(0, -1))
    return false
  })
}

function FileDropControl({ label, accept, onFile, onAsset, assetLibrary = [] }) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragActive(false)

    const assetId = event.dataTransfer.getData('application/x-template-asset-id')
    if (assetId && onAsset) {
      const asset = assetLibrary.find((item) => item.id === assetId)
      if (asset && assetMatchesAccept(asset, accept)) {
        onAsset(asset)
      }
      return
    }

    const file = Array.from(event.dataTransfer.files).find((item) =>
      fileMatchesAccept(item, accept),
    )

    if (file) {
      void Promise.resolve(onFile(file)).catch((error) => {
        window.alert(error instanceof Error ? error.message : 'Could not read this file.')
      })
    }
  }

  return (
    <label
      className={`field file-drop-field ${isDragActive ? 'active' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragActive(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        setIsDragActive(false)
      }}
      onDrop={handleDrop}
    >
      <span>{label}</span>
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void Promise.resolve(onFile(file)).catch((error) => {
              window.alert(error instanceof Error ? error.message : 'Could not read this file.')
            })
          }
          event.target.value = ''
        }}
      />
      <strong>Drop file here or browse</strong>
    </label>
  )
}

function ResizeHandles({ onResizeStart }) {
  return (
    <>
      {['nw', 'ne', 'sw', 'se'].map((handle) => (
        <span
          key={handle}
          className={`resize-handle handle-${handle}`}
          onPointerDown={(event) => onResizeStart(event, handle)}
        />
      ))}
    </>
  )
}

const defaultReferenceImage = {
  src: '',
  opacity: 0.5,
  position: 'center',
  scale: 1,
  fit: 'cover',
}

const cloneReferenceImage = (reference = defaultReferenceImage) => ({
  ...defaultReferenceImage,
  ...reference,
})

function App() {
  const [templateEntries, setTemplateEntries] = useState(starterTemplates)
  const [templateId, setTemplateId] = useState('starter')
  const [settings, setSettings] = useState(() => cloneTemplate('starter'))
  const [endScene, setEndScene] = useState(() => cloneEndScene(cloneTemplate('starter').endScene))
  const [scenes, setScenes] = useState(() => [
    {
      id: 'scene-1',
      name: 'Scene 1',
      startScene: true,
      autoShowNext: false,
      showAfterSeconds: 0,
      sceneChangeSfx: '',
      sceneChangeVolume: 1,
      settings: cloneTemplate('starter'),
      referenceImage: cloneReferenceImage(),
    },
  ])
  const [activeSceneId, setActiveSceneId] = useState('scene-1')
  const [selectedElement, setSelectedElement] = useState(null)
  const [, setActiveLayer] = useState('scene')
  const [isElementModalOpen, setIsElementModalOpen] = useState(false)
  const [elementModalPosition, setElementModalPosition] = useState({ x: 420, y: 96 })
  const [themeMode, setThemeMode] = useState(() =>
    window.localStorage.getItem('template-builder-theme') || 'dark',
  )
  const [previewPreset, setPreviewPreset] = useState('iphone-se')
  const [previewOrientation, setPreviewOrientation] = useState('portrait')
  const [exportType, setExportType] = useState('single')
  const [exportRuntime, setExportRuntime] = useState('javascript')
  const [exportFileName, setExportFileName] = useState('template')
  const [exportPageTitle, setExportPageTitle] = useState('Exported Template')
  const [exportConvertPngToWebp, setExportConvertPngToWebp] = useState(false)
  const [snapGuides, setSnapGuides] = useState({ x: false, y: false })
  const [alignmentGuides, setAlignmentGuides] = useState({ x: [], y: [] })
  const [referenceImage, setReferenceImage] = useState(() => cloneReferenceImage())
  const [assetLibrary, setAssetLibrary] = useState([])
  const [isDropActive, setIsDropActive] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewElapsedSeconds, setPreviewElapsedSeconds] = useState(0)
  const [isPreviewEndSceneVisible, setIsPreviewEndSceneVisible] = useState(false)
  const [previewStageSize, setPreviewStageSize] = useState({ width: 0, height: 0 })
  const [undoStack, setUndoStack] = useState([])
  const previewStageRef = useRef(null)
  const previewRef = useRef(null)
  const dragRef = useRef(null)
  const modalDragRef = useRef(null)
  const previewSceneStartedAtRef = useRef(0)
  const previewAudioRef = useRef({ firstInteractionStarted: false, background: null })
  const activeSceneIdRef = useRef(activeSceneId)
  const referenceImageRef = useRef(referenceImage)

  const canvas = settings.canvas
  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait'
  const activePreviewDevice = devicePresets.find((preset) => preset.id === previewPreset)
  const previewViewport = activePreviewDevice
    ? orientSize(activePreviewDevice, previewOrientation)
    : { width: canvas.width, height: canvas.height }
  const previewFitWidth = previewStageSize.width
    ? Math.max(160, previewStageSize.width - 84)
    : 620
  const previewFitHeight = previewStageSize.height
    ? Math.max(220, previewStageSize.height - 104)
    : 760
  const previewFrameScale = Math.min(
    1,
    previewFitWidth / previewViewport.width,
    previewFitHeight / previewViewport.height,
  )
  const previewCanvasScale = Math.min(previewViewport.width / canvas.width, previewViewport.height / canvas.height)
  const previewCanvasOffset = {
    x: (previewViewport.width - canvas.width * previewCanvasScale) / 2,
    y: getScaleOffsetY(
      previewViewport.height,
      canvas.height * previewCanvasScale,
      canvas.scalePosition,
    ),
  }
  const activePreviewName = activePreviewDevice?.name ?? devicePresets[0].name
  const isEndSceneActive = activeSceneId === END_SCENE_ID
  const elements = getElements(settings)
  const audioSettings = cloneAudioSettings(settings.audio)
  const sceneElements = getLayerElements(settings, 'scene')
  const overlayElements = getLayerElements(settings, 'overlay')
  const activeLayerElements = sceneElements
  const interactionElements = activeLayerElements.filter(
    (element) => element.nextSceneClick || element.mraidClick || element.type === 'hotspot',
  )
  const selectedConfig = elements.find((element) => element.id === selectedElement) ?? null
  const selectedIsFooter = selectedConfig?.fixedBottom || selectedConfig?.id?.startsWith('footer-')
  const selectedRole = getElementRole(selectedConfig)
  const selectedMraidClick = Boolean(selectedConfig?.mraidClick || selectedRole === 'cta')
  const selectedNextSceneClick = Boolean(selectedConfig?.nextSceneClick)
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0]
  const firstSceneId = getFirstSceneId(scenes)
  const isActiveFirstScene = !isEndSceneActive && activeScene?.id === firstSceneId

  useEffect(() => {
    activeSceneIdRef.current = activeSceneId
  }, [activeSceneId])

  useEffect(() => {
    referenceImageRef.current = referenceImage
  }, [referenceImage])
  const getExportScenes = () =>
    scenes.map((scene, index) => {
      const isActiveScene = scene.id === activeSceneId

      return {
        id: scene.id || `scene-${index + 1}`,
        name: scene.name || `Scene ${index + 1}`,
        startScene: (scene.id || `scene-${index + 1}`) === getFirstSceneId(scenes),
        autoShowNext: getSceneAutoShowNext(scene),
        showAfterSeconds: getSceneDelaySeconds(scene, 0),
        sceneChangeSfx: scene.sceneChangeSfx ?? '',
        sceneChangeVolume: Math.min(Math.max(Number(scene.sceneChangeVolume ?? 1) || 0, 0), 1),
        settings: applyBackgroundToSettings(
          {
            ...cloneSettings(isActiveScene ? settings : scene.settings),
            audio: cloneAudioSettings(settings.audio),
          },
          settings.background,
        ),
        referenceImage: cloneReferenceImage(isActiveScene ? referenceImage : scene.referenceImage),
      }
    })

  const getExportSettings = () => ({
    ...settings,
    background: cloneSettings(settings.background),
    audio: cloneAudioSettings(settings.audio),
    endScene,
    scenes: getExportScenes(),
  })

  const saveActiveSceneSettings = (nextSettings = settings, nextReferenceImage = null) => {
    const referenceToSave = nextReferenceImage ?? referenceImageRef.current

    setScenes((current) =>
      current.map((scene) =>
        scene.id === activeSceneId
          ? {
              ...scene,
              settings: cloneSettings(nextSettings),
              referenceImage: cloneReferenceImage(referenceToSave),
            }
          : scene,
      ),
    )
  }

  const applyReferenceImageToScene = (sceneId, nextReferenceImage, syncVisibleState = true) => {
    const clonedReferenceImage = cloneReferenceImage(nextReferenceImage)

    if (syncVisibleState && activeSceneIdRef.current === sceneId) {
      referenceImageRef.current = clonedReferenceImage
      setReferenceImage(clonedReferenceImage)
    }

    setScenes((currentScenes) =>
      currentScenes.map((scene) =>
        scene.id === sceneId
          ? { ...scene, referenceImage: cloneReferenceImage(clonedReferenceImage) }
          : scene,
      ),
    )
  }

  const updateReferenceImage = (updater) => {
    const targetSceneId = activeSceneId
    const currentReferenceImage = referenceImageRef.current
    const nextReferenceImage = cloneReferenceImage(
      typeof updater === 'function' ? updater(currentReferenceImage) : updater,
    )

    applyReferenceImageToScene(targetSceneId, nextReferenceImage)
  }

  const loadScene = (sceneId) => {
    if (sceneId === activeSceneId) return

    setIsPreviewEndSceneVisible(false)

    if (sceneId === END_SCENE_ID) {
      stopPreviewBackgroundMusic()
      saveActiveSceneSettings()
      setActiveSceneId(END_SCENE_ID)
      setSelectedElement(null)
      setIsElementModalOpen(false)
      setUndoStack([])
      setSnapGuides({ x: false, y: false })
      setAlignmentGuides({ x: [], y: [] })
      return
    }

    const nextScene = scenes.find((scene) => scene.id === sceneId)
    if (!nextScene) return

    saveActiveSceneSettings()
    const nextSettings = applySharedElementsToSettings(
      applyBackgroundToSettings(cloneSettings(nextScene.settings), settings.background),
      getSharedSceneElements(scenes, settings),
    )
    nextSettings.audio = cloneAudioSettings(settings.audio)
    const nextReferenceImage = cloneReferenceImage(nextScene.referenceImage)
    setActiveSceneId(sceneId)
    setSettings(nextSettings)
    setReferenceImage(nextReferenceImage)
    setSelectedElement(getFirstElementId(nextSettings))
    setActiveLayer('scene')
    setIsElementModalOpen(false)
    setUndoStack([])
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })
  }

  const renameActiveScene = (name) => {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === activeSceneId
          ? { ...scene, name }
          : scene,
      ),
    )
  }

  const updateActiveSceneMeta = (patch) => {
    if (isEndSceneActive) return

    setScenes((current) =>
      current.map((scene) =>
        scene.id === activeSceneId
          ? { ...scene, ...patch }
          : scene,
      ),
    )
  }

  const markActiveSceneAsFirst = () => {
    if (isEndSceneActive) return

    setScenes((current) =>
      current.map((scene) => ({
        ...scene,
        startScene: scene.id === activeSceneId,
        showAfterSeconds: getSceneDelaySeconds(scene, 0),
      })),
    )
  }

  const addScene = () => {
    const nextSettings = applySharedElementsToSettings(
      applyBackgroundToSettings(cloneTemplate(templateId, templateEntries), settings.background),
      getSharedSceneElements(scenes, settings),
    )
    nextSettings.audio = cloneAudioSettings(settings.audio)
    const nextScene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${scenes.length + 1}`,
      startScene: false,
      autoShowNext: false,
      showAfterSeconds: 0,
      sceneChangeSfx: '',
      sceneChangeVolume: 1,
      settings: cloneSettings(nextSettings),
      referenceImage: cloneReferenceImage(),
    }

    saveActiveSceneSettings()
    setScenes((current) => [...current, nextScene])
    setActiveSceneId(nextScene.id)
    setSettings(nextSettings)
    setReferenceImage(cloneReferenceImage(nextScene.referenceImage))
    setSelectedElement(getFirstElementId(nextSettings))
    setActiveLayer('scene')
    setIsElementModalOpen(false)
    setUndoStack([])
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })
  }

  const duplicateScene = () => {
    const nextSettings = applySharedElementsToSettings(
      cloneSettings(settings),
      getSharedSceneElements(scenes, settings),
    )
    nextSettings.audio = cloneAudioSettings(settings.audio)
    const nextScene = {
      id: `scene-${Date.now()}`,
      name: `${activeScene?.name || 'Scene'} Copy`,
      startScene: false,
      autoShowNext: getSceneAutoShowNext(activeScene),
      showAfterSeconds: getSceneDelaySeconds(activeScene, 0),
      sceneChangeSfx: activeScene?.sceneChangeSfx ?? '',
      sceneChangeVolume: Math.min(Math.max(Number(activeScene?.sceneChangeVolume ?? 1) || 0, 0), 1),
      settings: nextSettings,
      referenceImage: cloneReferenceImage(referenceImage),
    }

    saveActiveSceneSettings()
    setScenes((current) => [...current, nextScene])
    setActiveSceneId(nextScene.id)
    setSettings(cloneSettings(nextSettings))
    setReferenceImage(cloneReferenceImage(nextScene.referenceImage))
    setSelectedElement(getFirstElementId(nextSettings))
    setActiveLayer('scene')
    setIsElementModalOpen(false)
    setUndoStack([])
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })
  }

  const removeScene = () => {
    if (scenes.length <= 1) return

    const sceneIndex = scenes.findIndex((scene) => scene.id === activeSceneId)
    const nextScene = scenes[sceneIndex + 1] ?? scenes[sceneIndex - 1] ?? scenes[0]
    if (!nextScene) return

    const nextSettings = applySharedElementsToSettings(
      applyBackgroundToSettings(cloneSettings(nextScene.settings), settings.background),
      getSharedSceneElements(scenes, settings),
    )
    nextSettings.audio = cloneAudioSettings(settings.audio)
    const nextReferenceImage = cloneReferenceImage(nextScene.referenceImage)
    setScenes((current) => current.filter((scene) => scene.id !== activeSceneId))
    setActiveSceneId(nextScene.id)
    setSettings(nextSettings)
    setReferenceImage(nextReferenceImage)
    setSelectedElement(getFirstElementId(nextSettings))
    setActiveLayer('scene')
    setIsElementModalOpen(false)
    setUndoStack([])
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })
  }

  const addEndScene = () => {
    saveActiveSceneSettings()
    setEndScene((current) => ({
      ...cloneEndScene(current),
      enabled: true,
    }))
    setActiveSceneId(END_SCENE_ID)
    setSelectedElement(null)
    setIsElementModalOpen(false)
    setUndoStack([])
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })
  }

  const removeEndScene = () => {
    const nextScene = scenes[0]
    const nextSettings = {
      ...cloneSettings(nextScene.settings),
      audio: cloneAudioSettings(settings.audio),
    }

    setEndScene(cloneEndScene())
    setActiveSceneId(nextScene.id)
    setSettings(nextSettings)
    setReferenceImage(cloneReferenceImage(nextScene.referenceImage))
    setSelectedElement(getFirstElementId(nextSettings))
    setActiveLayer('scene')
    setIsElementModalOpen(false)
  }

  const updateEndScene = (patch) => {
    setEndScene((current) => cloneEndScene({ ...current, ...patch }))
  }

  const stopPreviewBackgroundMusic = useCallback(() => {
    const backgroundAudio = previewAudioRef.current.background
    if (backgroundAudio) {
      backgroundAudio.pause()
      backgroundAudio.currentTime = 0
    }

    previewAudioRef.current = { firstInteractionStarted: false, background: null }
  }, [])

  const playPreviewAudio = useCallback((src, volume, label, options = {}) => {
    if (!src) return

    try {
      const audio = options.audio ?? new Audio(src)
      audio.volume = Math.min(Math.max(Number(volume) || 0, 0), 1)
      audio.loop = Boolean(options.loop)
      audio.currentTime = 0
      const playResult = audio.play()
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch((error) => {
          console.warn(`[Audio] ${label} failed to play.`, error)
        })
      }
      return audio
    } catch (error) {
      console.warn(`[Audio] ${label} failed to play.`, error)
      return null
    }
  }, [])

  const startPreviewBackgroundMusicOnce = useCallback(() => {
    if (previewAudioRef.current.firstInteractionStarted) return
    if (isPreviewEndSceneVisible || isEndSceneActive) return

    previewAudioRef.current.firstInteractionStarted = true
    const audio = cloneAudioSettings(settings.audio)
    if (!audio.backgroundMusic) return

    const background = playPreviewAudio(
      audio.backgroundMusic,
      audio.backgroundVolume,
      'Background music',
      { loop: audio.backgroundLoop },
    )
    previewAudioRef.current.background = background
  }, [isEndSceneActive, isPreviewEndSceneVisible, playPreviewAudio, settings.audio])

  const playPreviewInteractionSfx = useCallback((element) => {
    startPreviewBackgroundMusicOnce()
    playPreviewAudio(element?.interactionSfx, element?.interactionVolume ?? 1, 'Interaction SFX')
  }, [playPreviewAudio, startPreviewBackgroundMusicOnce])

  const playPreviewSceneChangeSfx = useCallback(() => {
    const scene = scenes.find((item) => item.id === activeSceneId)
    playPreviewAudio(scene?.sceneChangeSfx, scene?.sceneChangeVolume ?? 1, 'Scene change SFX')
  }, [activeSceneId, playPreviewAudio, scenes])

  const startPreviewPlayback = () => {
    const firstScene = scenes.find((scene) => scene.id === firstSceneId) ?? scenes[0]
    if (!firstScene) return

    stopPreviewBackgroundMusic()
    setIsPreviewPlaying(true)
    setIsPreviewEndSceneVisible(false)
    setPreviewElapsedSeconds(0)
    previewSceneStartedAtRef.current = window.performance.now()
    loadScene(firstScene.id)
  }

  const stopPreviewPlayback = () => {
    setIsPreviewPlaying(false)
    setIsPreviewEndSceneVisible(false)
    setPreviewElapsedSeconds(0)
    stopPreviewBackgroundMusic()
  }

  const setEndSceneFile = async (file) => {
    updateEndScene({
      enabled: true,
      name: getFileBaseName(file.name) || 'End Scene',
      html: await readFileAsText(file),
    })
  }

  const openElementSettings = (elementId, fallbackLayer) => {
    const nextElement = getElements(settings).find((element) => element.id === elementId)

    setSelectedElement(elementId)
    setActiveLayer(fallbackLayer ?? getElementLayer(nextElement))
    setIsElementModalOpen(true)
  }

  const startElementModalDrag = (event) => {
    event.preventDefault()
    event.stopPropagation()

    modalDragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: elementModalPosition.x,
      startY: elementModalPosition.y,
    }
  }

  useEffect(() => {
    window.localStorage.setItem('template-builder-theme', themeMode)
  }, [themeMode])

  useEffect(() => {
    const stage = previewStageRef.current
    if (!stage) return undefined

    const updatePreviewStageSize = () => {
      const rect = stage.getBoundingClientRect()
      setPreviewStageSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }

    updatePreviewStageSize()

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(updatePreviewStageSize)
      observer.observe(stage)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', updatePreviewStageSize)
    return () => window.removeEventListener('resize', updatePreviewStageSize)
  }, [])

  useEffect(() => {
    if (!isPreviewPlaying) return undefined

    previewSceneStartedAtRef.current = window.performance.now()
    setPreviewElapsedSeconds(0)

    let frameId = 0
    const tick = () => {
      setPreviewElapsedSeconds((window.performance.now() - previewSceneStartedAtRef.current) / 1000)
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [isPreviewPlaying, activeSceneId])

  useEffect(() => {
    if (!isPreviewPlaying || isEndSceneActive) return undefined

    const currentIndex = scenes.findIndex((scene) => scene.id === activeSceneId)
    const currentScene = scenes[currentIndex]
    if (!getSceneAutoShowNext(currentScene)) return undefined

    const nextScene = scenes[currentIndex + 1]
    if (!nextScene) {
      if (!endScene.enabled || (!endScene.html && !endScene.src)) return undefined

      const timerId = window.setTimeout(() => {
        playPreviewSceneChangeSfx()
        stopPreviewBackgroundMusic()
        setIsPreviewEndSceneVisible(true)
      }, Math.max(0, Number(endScene.delaySeconds ?? 0.95) || 0) * 1000)

      return () => window.clearTimeout(timerId)
    }

    const timerId = window.setTimeout(() => {
      playPreviewSceneChangeSfx()
      setIsPreviewEndSceneVisible(false)
      const nextSettings = applySharedElementsToSettings(
        applyBackgroundToSettings(cloneSettings(nextScene.settings), settings.background),
        getSharedSceneElements(scenes, settings),
      )
      nextSettings.audio = cloneAudioSettings(settings.audio)
      const nextReferenceImage = cloneReferenceImage(nextScene.referenceImage)

      setScenes((current) =>
        current.map((scene) =>
          scene.id === activeSceneId
            ? {
                ...scene,
                settings: cloneSettings(settings),
                referenceImage: cloneReferenceImage(referenceImage),
              }
            : scene,
        ),
      )
      setActiveSceneId(nextScene.id)
      setSettings(nextSettings)
      setReferenceImage(nextReferenceImage)
      setSelectedElement(null)
      setActiveLayer('scene')
      setIsElementModalOpen(false)
      setUndoStack([])
      setSnapGuides({ x: false, y: false })
      setAlignmentGuides({ x: [], y: [] })
    }, getSceneDelaySeconds(currentScene, 0) * 1000)

    return () => window.clearTimeout(timerId)
  }, [
    isPreviewPlaying,
    isEndSceneActive,
    activeSceneId,
    scenes,
    settings,
    referenceImage,
    endScene,
    playPreviewSceneChangeSfx,
    stopPreviewBackgroundMusic,
  ])

  const updateSection = (section, patch) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }))

    if (section === 'background') {
      setScenes((currentScenes) =>
        currentScenes.map((scene) => ({
          ...scene,
          settings: applyBackgroundToSettings(scene.settings, {
            ...settings.background,
            ...patch,
          }),
        })),
      )
    }
  }

  const updateAudioSettings = (patch) => {
    setSettings((current) => {
      const nextAudio = cloneAudioSettings({
        ...current.audio,
        ...patch,
      })

      setScenes((currentScenes) =>
        currentScenes.map((scene) => ({
          ...scene,
          settings: {
            ...scene.settings,
            audio: cloneAudioSettings(nextAudio),
          },
        })),
      )

      return {
        ...current,
        audio: nextAudio,
      }
    })
  }

  const setAudioFile = async (key, file) => {
    const audio = await readFileAsDataUrl(file)
    updateAudioSettings({ [key]: audio })
  }

  const setActiveSceneSfxFile = async (file) => {
    const audio = await readFileAsDataUrl(file)
    updateActiveSceneMeta({ sceneChangeSfx: audio })
  }

  const setSelectedInteractionSfxFile = async (file) => {
    if (!selectedConfig) return

    const audio = await readFileAsDataUrl(file)
    updateElement(selectedConfig.id, { interactionSfx: audio })
  }

  const pushMoveSnapshot = () => {
    setUndoStack((current) => [
      ...current.slice(-24),
      {
        settings: JSON.parse(JSON.stringify(settings)),
        referenceImage: { ...referenceImage },
        selectedElement,
      },
    ])
  }

  const undoLastMove = () => {
    const previous = undoStack.at(-1)
    if (!previous) return

    setSettings(previous.settings)
    setReferenceImage(cloneReferenceImage(previous.referenceImage))
    const previousSharedElements = getElements(previous.settings).filter(
      (element) => element.applyToAllScenes,
    )
    if (previousSharedElements.length > 0) {
      setScenes((currentScenes) =>
        currentScenes.map((scene) => ({
          ...scene,
          settings: applySharedElementsToSettings(scene.settings, previousSharedElements),
        })),
      )
    }
    const nextSelectedElement = previous.selectedElement ?? getFirstElementId(previous.settings)
    const nextSelectedConfig = getElements(previous.settings).find((element) => element.id === nextSelectedElement)

    setSelectedElement(nextSelectedElement)
    setActiveLayer(getElementLayer(nextSelectedConfig))
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })
    setUndoStack((current) => current.slice(0, -1))
  }

  const importTemplateSettings = (importedSettings, fileName) => {
    const nextSettings = normalizeTemplateSettings(importedSettings)
    const nextEndScene = cloneEndScene(importedSettings.endScene ?? nextSettings.endScene)
    const rawImportedScenes = Array.isArray(importedSettings.scenes) && importedSettings.scenes.length > 0
      ? importedSettings.scenes.map((scene, index) => ({
          id: scene.id || `scene-${index + 1}`,
          name: scene.name || `Scene ${index + 1}`,
          ...normalizeSceneMeta(scene, index),
          settings: normalizeTemplateSettings(scene.settings ?? nextSettings),
          referenceImage: cloneReferenceImage(scene.referenceImage),
        }))
      : [
          {
            id: 'scene-1',
            name: 'Scene 1',
            startScene: true,
            autoShowNext: false,
            showAfterSeconds: 0,
            sceneChangeSfx: '',
            sceneChangeVolume: 1,
            settings: cloneSettings(nextSettings),
            referenceImage: cloneReferenceImage(),
          },
        ]
    const globalBackground = cloneSettings(rawImportedScenes[0]?.settings?.background ?? nextSettings.background)
    const importedScenes = rawImportedScenes.map((scene) => ({
      ...scene,
      settings: applyBackgroundToSettings(scene.settings, globalBackground),
    }))
    const firstScene = importedScenes[0]
    const id = `imported-${Date.now()}`
    const nextTemplate = {
      id,
      name: getFileTemplateName(fileName),
      details: 'Imported template',
      defaults: cloneSettings(firstScene.settings),
    }

    setTemplateEntries((current) => [...current, nextTemplate])
    setTemplateId(id)
    setSettings(cloneSettings(firstScene.settings))
    setEndScene(nextEndScene)
    setReferenceImage(cloneReferenceImage(firstScene.referenceImage))
    setScenes(importedScenes)
    setActiveSceneId(firstScene.id)
    setSelectedElement(getFirstElementId(firstScene.settings))
    setActiveLayer('scene')
    setIsElementModalOpen(false)
    setPreviewPreset('iphone-se')
    setPreviewOrientation('portrait')
    setUndoStack([])
  }

  const handleImportTemplateFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const lowerName = file.name.toLowerCase()
      const importedSettings = lowerName.endsWith('.zip')
        ? await readSettingsFromProjectZip(file)
        : readSettingsFromHtml(await readFileAsText(file))

      importTemplateSettings(importedSettings, file.name)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not import this template.')
    } finally {
      event.target.value = ''
    }
  }

  const handleImportProjectFolder = async (event) => {
    const files = event.target.files
    if (!files?.length) return

    try {
      const importedSettings = await readSettingsFromProjectFolder(files)
      importTemplateSettings(importedSettings, files[0].webkitRelativePath.split('/')[0] || 'project-folder')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not import this project folder.')
    } finally {
      event.target.value = ''
    }
  }

  const updateElement = (elementId, patch) => {
    setSettings((current) => {
      const existingElement = getElements(current).find((element) => element.id === elementId)
      if (!existingElement) return current

      const nextElement = {
        ...existingElement,
        ...patch,
      }
      const nextSettings = {
        ...current,
        elements: getElements(current).map((element) =>
          element.id === elementId ? nextElement : element,
        ),
      }

      if (nextElement.applyToAllScenes) {
        setScenes((currentScenes) =>
          currentScenes.map((scene) => ({
            ...scene,
            settings: upsertElementInSettings(scene.settings, nextElement),
          })),
        )
      }

      return nextSettings
    })
  }

  const setElementApplyToAllScenes = (elementId, applyToAllScenes) => {
    setSettings((current) => {
      const existingElement = getElements(current).find((element) => element.id === elementId)
      if (!existingElement) return current

      const nextElement = {
        ...existingElement,
        applyToAllScenes,
      }
      const nextSettings = applyToAllScenes
        ? upsertElementInSettings(current, nextElement)
        : {
            ...current,
            elements: getElements(current).map((element) =>
              element.id === elementId ? nextElement : element,
            ),
          }

      setScenes((currentScenes) =>
        currentScenes.map((scene) => ({
          ...scene,
          settings: applyToAllScenes
            ? upsertElementInSettings(scene.settings, nextElement)
            : scene.id === activeSceneId
              ? upsertElementInSettings(scene.settings, nextElement)
              : removeElementFromSettings(scene.settings, elementId),
        })),
      )

      return nextSettings
    })
  }

  const changeElementType = (elementId, type) => {
    updateElement(elementId, getTypeDefaults(type))
  }

  const getUniqueElementName = (baseName, ignoreElementId = null) => {
    const cleanBaseName = String(baseName || 'Element').trim() || 'Element'
    const existingNames = new Set(
      activeLayerElements
        .filter((element) => element.id !== ignoreElementId)
        .map((element) => String(element.name || '').trim().toLowerCase())
        .filter(Boolean),
    )

    if (!existingNames.has(cleanBaseName.toLowerCase())) return cleanBaseName

    let index = 2
    while (existingNames.has(`${cleanBaseName} ${index}`.toLowerCase())) {
      index += 1
    }

    return `${cleanBaseName} ${index}`
  }

  const addElement = (type = 'div') => {
    const createdElement = createTemplateElement(type, canvas, activeLayerElements.length + 1)
    const nextElement = {
      ...createdElement,
      name: getUniqueElementName(createdElement.name),
      layer: 'scene',
      zIndex: Math.max(0, ...activeLayerElements.map((element) => element.zIndex ?? 0)) + 1,
    }

    setSettings((current) => ({
      ...current,
      elements: [...getElements(current), nextElement],
    }))
    openElementSettings(nextElement.id, 'scene')
  }

  const duplicateElement = () => {
    if (!selectedConfig) return

    const nextElement = {
      ...JSON.parse(JSON.stringify(selectedConfig)),
      id: `element-${Date.now()}`,
      name: getUniqueElementName(`${selectedConfig.name || 'Element'} Copy`, selectedConfig.id),
      applyToAllScenes: selectedConfig.applyToAllScenes ?? false,
      x: selectedConfig.fullWidth
        ? selectedConfig.x
        : Math.round(selectedConfig.x + 20),
      y: selectedConfig.fixedTop || selectedConfig.fixedBottom
        ? selectedConfig.y
        : Math.round(selectedConfig.y + 20),
      layer: getElementLayer(selectedConfig),
      zIndex: Math.max(
        0,
        ...elements
          .filter((element) => getElementLayer(element) === getElementLayer(selectedConfig))
          .map((element) => element.zIndex ?? 0),
      ) + 1,
    }

    setSettings((current) => ({
      ...current,
      overlay: getElementLayer(nextElement) === 'overlay'
        ? { ...current.overlay, enabled: true, showInPreview: true }
        : current.overlay,
      elements: [...getElements(current), nextElement],
    }))
    if (nextElement.applyToAllScenes) {
      setScenes((currentScenes) =>
        currentScenes.map((scene) => ({
          ...scene,
          settings: upsertElementInSettings(scene.settings, nextElement),
        })),
      )
    }
    openElementSettings(nextElement.id, getElementLayer(nextElement))
  }

  const removeElement = () => {
    if (!selectedConfig) return

    const selectedLayer = getElementLayer(selectedConfig)
    const visibleElements = elements.filter((element) => getElementLayer(element) === selectedLayer)
    const selectedIndex = visibleElements.findIndex((element) => element.id === selectedConfig.id)
    const nextElements = visibleElements.filter((element) => element.id !== selectedConfig.id)
    const nextSelection =
      nextElements[selectedIndex]?.id
      ?? nextElements[selectedIndex - 1]?.id
      ?? null

    pushMoveSnapshot()
    setSettings((current) => removeElementFromSettings(current, selectedConfig.id))
    if (selectedConfig.applyToAllScenes) {
      setScenes((currentScenes) =>
        currentScenes.map((scene) => ({
          ...scene,
          settings: removeElementFromSettings(scene.settings, selectedConfig.id),
        })),
      )
    }
    setSelectedElement(nextSelection)
    setActiveLayer(selectedLayer)
    setIsElementModalOpen(Boolean(nextSelection))
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })
  }

  const setCanvasSize = (width, height) => {
    updateSection('canvas', { width, height })
  }

  const applyPreviewPreset = (presetId) => {
    setPreviewPreset(presetId)
  }

  const applyPreviewOrientation = (nextOrientation) => {
    setPreviewOrientation(nextOrientation)
  }

  const setBackgroundImageFile = async (file) => {
    const image = await readFileAsDataUrl(file)
    updateSection('background', { image })
  }

  const setReferenceImageFile = async (file) => {
    const targetSceneId = activeSceneId
    const image = await readFileAsDataUrl(file)
    const baseReferenceImage =
      targetSceneId === activeSceneIdRef.current
        ? referenceImage
        : scenes.find((scene) => scene.id === targetSceneId)?.referenceImage

    applyReferenceImageToScene(
      targetSceneId,
      {
        ...cloneReferenceImage(baseReferenceImage),
        src: image,
      },
    )
  }

  const setElementMediaFile = async (file) => {
    if (!selectedConfig) return

    const media = await readFileAsDataUrl(file)
    const dimensions = await readMediaDimensions(media, selectedConfig.type)
    const fileBaseName = getFileBaseName(file.name)
    const shouldUseFileName =
      fileBaseName && (!selectedConfig.name || selectedConfig.name.startsWith('Element '))

    updateElement(selectedConfig.id, {
      src: media,
      name: shouldUseFileName ? fileBaseName : selectedConfig.name,
      ...getMediaLayoutPatch(selectedConfig, dimensions, canvas),
    })
  }

  const setElementPosterFile = async (file) => {
    if (!selectedConfig) return

    const poster = await readFileAsDataUrl(file)
    updateElement(selectedConfig.id, { poster })
  }

  const readAssetLibraryFile = async (file) => {
    const type = getDroppedMediaType(file)
    if (!type) return null

    const src = await readFileAsDataUrl(file)
    const dimensions = type === 'audio' ? null : await readMediaDimensions(src, type)

    return {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: getFileBaseName(file.name) || (type === 'audio' ? 'SFX' : type === 'image' ? 'Image' : 'Video'),
      type,
      src,
      dimensions,
    }
  }

  const addAssetLibraryFiles = async (files) => {
    const nextAssets = (await Promise.all(
      Array.from(files)
        .filter((file) => getDroppedMediaType(file))
        .map(readAssetLibraryFile),
    )).filter(Boolean)

    if (nextAssets.length === 0) return

    setAssetLibrary((current) => {
      const existingSources = new Set(current.map((asset) => asset.src))
      const uniqueAssets = nextAssets.filter((asset) => !existingSources.has(asset.src))

      return [...current, ...uniqueAssets]
    })
  }

  const renameAssetLibraryItem = (assetId, name) => {
    setAssetLibrary((current) =>
      current.map((asset) =>
        asset.id === assetId
          ? { ...asset, name }
          : asset,
      ),
    )
  }

  const addAssetToScene = (asset, dropPoint = null) => {
    if (!asset) return
    if (asset.type === 'audio') return
    const assetBaseName = asset.name || (asset.type === 'image' ? 'Image' : 'Video')

    const nextElement = {
      ...createTemplateElement(asset.type, canvas, activeLayerElements.length + 1),
      id: `element-${Date.now()}`,
      name: getUniqueElementName(assetBaseName),
      layer: 'scene',
      src: asset.src,
      zIndex: Math.max(0, ...activeLayerElements.map((element) => element.zIndex ?? 0)) + 1,
    }
    const fittedSize = getCanvasFittedMediaSize(asset.dimensions, canvas, {
      width: nextElement.width,
      height: nextElement.height,
    })
    const targetPoint = dropPoint ?? {
      x: canvas.width / 2,
      y: canvas.height / 2,
    }

    nextElement.width = fittedSize.width
    nextElement.height = fittedSize.height
    nextElement.lockAspectRatio = true
    nextElement.x = Math.round(clampNumber(
      targetPoint.x - nextElement.width / 2,
      0,
      Math.max(0, canvas.width - nextElement.width),
    ))
    nextElement.y = Math.round(clampNumber(
      targetPoint.y - nextElement.height / 2,
      0,
      Math.max(0, canvas.height - nextElement.height),
    ))

    pushMoveSnapshot()
    setSettings((current) => ({
      ...current,
      elements: [...getElements(current), nextElement],
    }))
    openElementSettings(nextElement.id, 'scene')
  }

  const getCanvasPointFromClient = (clientX, clientY) => {
    if (!previewRef.current) return null

    const rect = previewRef.current.getBoundingClientRect()
    const renderedScaleX = rect.width / canvas.width
    const renderedScaleY = rect.height / canvas.height

    return {
      x: (clientX - rect.left) / renderedScaleX,
      y: (clientY - rect.top) / renderedScaleY,
    }
  }

  const getDroppedMediaType = (file) => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return null
  }

  const handlePreviewDragOver = (event) => {
    const transferTypes = Array.from(event.dataTransfer?.types ?? [])
    const hasFiles = transferTypes.includes('Files')
    const hasLibraryAsset = transferTypes.includes('application/x-template-asset-id')
    if (!hasFiles && !hasLibraryAsset) return
    if (hasLibraryAsset) {
      const assetId = event.dataTransfer.getData('application/x-template-asset-id')
      const asset = assetLibrary.find((item) => item.id === assetId)
      if (asset?.type === 'audio') return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDropActive(true)
  }

  const handlePreviewDragLeave = (event) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setIsDropActive(false)
  }

  const handlePreviewDrop = async (event) => {
    event.preventDefault()
    setIsDropActive(false)

    const assetId = event.dataTransfer.getData('application/x-template-asset-id')
    const dropPoint = getCanvasPointFromClient(event.clientX, event.clientY)

    if (assetId) {
      const asset = assetLibrary.find((item) => item.id === assetId)
      if (asset && asset.type !== 'audio' && dropPoint) {
        addAssetToScene(asset, dropPoint)
      }
      return
    }

    const file = Array.from(event.dataTransfer.files).find((item) => getDroppedMediaType(item))
    const type = file ? getDroppedMediaType(file) : null

    if (!file || !type || !dropPoint) return

    try {
      const asset = await readAssetLibraryFile(file)
      if (!asset) return

      setAssetLibrary((current) =>
        current.some((item) => item.src === asset.src) ? current : [...current, asset],
      )
      addAssetToScene(asset, dropPoint)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not add this file.')
    }
  }

  const startDrag = (event, elementName) => {
    if (!previewRef.current) return

    event.preventDefault()
    event.stopPropagation()
    setSelectedElement(elementName)
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })

    const rect = previewRef.current.getBoundingClientRect()
    const item = getElements(settings).find((element) => element.id === elementName)
    if (!item) return
    setActiveLayer(getElementLayer(item))
    pushMoveSnapshot()

    const renderedScaleX = rect.width / canvas.width
    const renderedScaleY = rect.height / canvas.height
    const pointerX = (event.clientX - rect.left) / renderedScaleX
    const pointerY = (event.clientY - rect.top) / renderedScaleY

    dragRef.current = {
      elementName,
      elementLayer: getElementLayer(item),
      offsetX: pointerX - item.x,
      offsetY: pointerY - item.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      hasMoved: false,
    }
  }

  const startResize = (event, targetId, handle) => {
    if (!previewRef.current) return

    event.preventDefault()
    event.stopPropagation()
    setSelectedElement(targetId)
    setSnapGuides({ x: false, y: false })
    setAlignmentGuides({ x: [], y: [] })

    const rect = previewRef.current.getBoundingClientRect()
    const renderedScaleX = rect.width / canvas.width
    const renderedScaleY = rect.height / canvas.height
    const pointerX = (event.clientX - rect.left) / renderedScaleX
    const pointerY = (event.clientY - rect.top) / renderedScaleY
    const item = getElements(settings).find((element) => element.id === targetId)

    if (!item) return
    setActiveLayer(getElementLayer(item))
    pushMoveSnapshot()

    dragRef.current = {
      action: 'resize',
      targetId,
      handle,
      startX: pointerX,
      startY: pointerY,
      startBox: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        fullWidth: item.fullWidth,
        fixedTop: item.fixedTop,
        fixedBottom: item.fixedBottom,
        lockAspectRatio: item.lockAspectRatio,
      },
    }
  }

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragRef.current || !previewRef.current) return

      const dragState = dragRef.current

      if (dragState.action === 'resize') {
        const rect = previewRef.current.getBoundingClientRect()
        const targetId = dragState.targetId
        const minSize = 1

        setSettings((current) => {
          const renderedScaleX = rect.width / current.canvas.width
          const renderedScaleY = rect.height / current.canvas.height
          const pointerX = (event.clientX - rect.left) / renderedScaleX
          const pointerY = (event.clientY - rect.top) / renderedScaleY
          const deltaX = pointerX - dragState.startX
          const deltaY = pointerY - dragState.startY
          const canvasWidth = current.canvas.width
          const canvasHeight = current.canvas.height
          const startBox = dragState.startBox
          const followsScreen = startBox.fullWidth
          const fixedEdge = startBox.fixedTop || startBox.fixedBottom
          const locksRatio = Boolean(startBox.lockAspectRatio && !followsScreen && startBox.height > 0)
          const aspectRatio = startBox.width / startBox.height
          let nextX = startBox.x
          let nextY = startBox.y
          let nextWidth = startBox.width
          let nextHeight = startBox.height

          if (!followsScreen) {
            if (dragState.handle.includes('e')) nextWidth = startBox.width + deltaX
            if (dragState.handle.includes('w')) {
              nextX = startBox.x + deltaX
              nextWidth = startBox.width - deltaX
            }
          }

          if (dragState.handle.includes('s')) nextHeight = startBox.height + deltaY
          if (dragState.handle.includes('n')) {
            nextY = startBox.y + deltaY
            nextHeight = startBox.height - deltaY
          }

          if (locksRatio) {
            const widthChange = Math.abs(nextWidth - startBox.width) / Math.max(1, startBox.width)
            const heightChange = Math.abs(nextHeight - startBox.height) / Math.max(1, startBox.height)

            if (widthChange >= heightChange) {
              nextHeight = nextWidth / aspectRatio
              if (dragState.handle.includes('n')) {
                nextY = startBox.y + startBox.height - nextHeight
              }
            } else {
              nextWidth = nextHeight * aspectRatio
              if (dragState.handle.includes('w')) {
                nextX = startBox.x + startBox.width - nextWidth
              }
            }
          }

          if (nextWidth < minSize) {
            if (dragState.handle.includes('w') && !followsScreen) {
              nextX -= minSize - nextWidth
            }
            nextWidth = minSize
            if (locksRatio) {
              nextHeight = nextWidth / aspectRatio
              if (dragState.handle.includes('n')) {
                nextY = startBox.y + startBox.height - nextHeight
              }
            }
          }

          if (nextHeight < minSize) {
            if (dragState.handle.includes('n')) nextY -= minSize - nextHeight
            nextHeight = minSize
            if (locksRatio) {
              nextWidth = nextHeight * aspectRatio
              if (dragState.handle.includes('w')) {
                nextX = startBox.x + startBox.width - nextWidth
              }
            }
          }

          if (followsScreen) {
            nextX = startBox.x
            nextWidth = startBox.width
          }

          nextY = fixedEdge ? startBox.y : nextY

          const rightGap = canvasWidth - (nextX + nextWidth)
          const bottomGap = canvasHeight - (nextY + nextHeight)
          const snapRight = !locksRatio && !followsScreen && Math.abs(rightGap) <= 14
          const snapBottom = !locksRatio && !fixedEdge && Math.abs(bottomGap) <= 14
          const snappedX = !followsScreen ? getContainerSnap(nextX, nextWidth, canvasWidth) : { value: nextX, snapped: false }
          const snappedY = !fixedEdge ? getContainerSnap(nextY, nextHeight, canvasHeight) : { value: nextY, snapped: false }

          if (snapRight) nextWidth = canvasWidth - nextX
          if (snapBottom) nextHeight = canvasHeight - nextY
          if (!snapRight) nextX = snappedX.value
          if (!snapBottom && !fixedEdge) nextY = snappedY.value

          setSnapGuides({
            x: snappedX.snapped || snapRight,
            y: snappedY.snapped || snapBottom,
          })

          const resizedBox = {
            x: Math.round(nextX),
            y: Math.round(nextY),
            width: Math.round(nextWidth),
            height: Math.round(nextHeight),
          }
          const alignmentBox = {
            x: followsScreen ? 0 : resizedBox.x,
            y: startBox.fixedBottom
              ? canvasHeight - resizedBox.height
              : fixedEdge
                ? startBox.y
                : resizedBox.y,
            width: followsScreen ? canvasWidth : resizedBox.width,
            height: resizedBox.height,
          }

          setAlignmentGuides(findAlignmentGuides(
            alignmentBox,
            getAlignmentBoxes(current, targetId),
          ))

          const nextElements = getElements(current).map((element) =>
            element.id === targetId
              ? {
                  ...element,
                  x: followsScreen ? element.x : resizedBox.x,
                  y: fixedEdge ? element.y : resizedBox.y,
                  width: followsScreen ? element.width : resizedBox.width,
                  height: resizedBox.height,
                }
              : element,
          )
          const nextElement = nextElements.find((element) => element.id === targetId)

          if (nextElement?.applyToAllScenes) {
            setScenes((currentScenes) =>
              currentScenes.map((scene) => ({
                ...scene,
                settings: upsertElementInSettings(scene.settings, nextElement),
              })),
            )
          }

          return {
            ...current,
            elements: nextElements,
          }
        })
        return
      }

      if (
        !dragState.hasMoved &&
        Math.hypot(event.clientX - dragState.startClientX, event.clientY - dragState.startClientY) > 4
      ) {
        dragState.hasMoved = true
      }

      const { elementName, offsetX, offsetY } = dragState

      setSettings((current) => {
        const item = getElements(current).find((element) => element.id === elementName)
        if (!item) return current

        const rect = previewRef.current.getBoundingClientRect()
        const renderedScaleX = rect.width / current.canvas.width
        const renderedScaleY = rect.height / current.canvas.height
        const nextX = (event.clientX - rect.left) / renderedScaleX - offsetX
        const nextY = (event.clientY - rect.top) / renderedScaleY - offsetY
        const followsScreen = item.fullWidth
        const fixedEdge = item.fixedTop || item.fixedBottom
        const snappedX = getCenterSnap(nextX, item.width, current.canvas.width)
        const snappedY = getVerticalSnap(nextY, item.height, current.canvas.height)
        const finalX = followsScreen
          ? item.x
          : Math.round(snappedX.value)
        const finalY = fixedEdge
          ? item.y
          : Math.round(snappedY.value)

        setSnapGuides({
          x: !followsScreen && snappedX.snapped,
          y: !fixedEdge && snappedY.snapped,
        })
        setAlignmentGuides(findAlignmentGuides(
          {
            x: followsScreen ? 0 : finalX,
            y: item.fixedBottom ? current.canvas.height - item.height : finalY,
            width: followsScreen ? current.canvas.width : item.width,
            height: item.height,
          },
          getAlignmentBoxes(current, elementName),
        ))

        const nextElements = getElements(current).map((element) =>
          element.id === elementName
            ? {
                ...element,
                x: finalX,
                y: finalY,
              }
            : element,
        )
        const nextElement = nextElements.find((element) => element.id === elementName)

        if (nextElement?.applyToAllScenes) {
          setScenes((currentScenes) =>
            currentScenes.map((scene) => ({
              ...scene,
              settings: upsertElementInSettings(scene.settings, nextElement),
            })),
          )
        }

        return {
          ...current,
          elements: nextElements,
        }
      })
    }

    const stopDrag = () => {
      const dragState = dragRef.current

      dragRef.current = null
      setSnapGuides({ x: false, y: false })
      setAlignmentGuides({ x: [], y: [] })

      if (dragState && !dragState.action && !dragState.hasMoved) {
        setSelectedElement(dragState.elementName)
        setActiveLayer(dragState.elementLayer ?? 'scene')
        setIsElementModalOpen(true)
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stopDrag)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stopDrag)
    }
  }, [])

  useEffect(() => {
    const handleMove = (event) => {
      const dragState = modalDragRef.current
      if (!dragState) return

      const panelWidth = Math.min(420, window.innerWidth - 24)
      const panelHeight = Math.min(680, window.innerHeight - 24)
      const nextX = dragState.startX + event.clientX - dragState.startClientX
      const nextY = dragState.startY + event.clientY - dragState.startClientY

      setElementModalPosition({
        x: Math.min(Math.max(12, nextX), Math.max(12, window.innerWidth - panelWidth - 12)),
        y: Math.min(Math.max(12, nextY), Math.max(12, window.innerHeight - panelHeight - 12)),
      })
    }

    const stopDrag = () => {
      modalDragRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stopDrag)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stopDrag)
    }
  }, [])

  const backgroundSize =
    settings.background.fit === 'stretch' ? '100% 100%' : settings.background.fit

  const canvasStyle = {
    width: `${canvas.width}px`,
    height: `${canvas.height}px`,
    left: `${Math.round(previewCanvasOffset.x)}px`,
    top: `${Math.round(previewCanvasOffset.y)}px`,
    transform: `scale(${previewCanvasScale})`,
  }

  const frameStyle = {
    width: `${previewViewport.width * previewFrameScale}px`,
    height: `${previewViewport.height * previewFrameScale}px`,
  }

  const deviceViewportStyle = {
    width: `${previewViewport.width}px`,
    height: `${previewViewport.height}px`,
    transform: `scale(${previewFrameScale})`,
  }

  const previewBackgroundStyle = {
    backgroundColor: settings.background.color,
    backgroundImage: settings.background.image ? `url(${settings.background.image})` : undefined,
    backgroundSize,
    opacity: settings.background.opacity ?? 1,
  }
  const previewOverlayStyle = {
    backgroundColor: settings.overlay?.color ?? '#000000',
    backgroundImage: settings.overlay?.image ? `url(${settings.overlay.image})` : undefined,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: settings.overlay?.fit === 'stretch' ? '100% 100%' : settings.overlay?.fit ?? 'cover',
    opacity: settings.overlay?.opacity ?? 0.35,
    backdropFilter: settings.overlay?.blur ? `blur(${settings.overlay.blur}px)` : undefined,
    WebkitBackdropFilter: settings.overlay?.blur ? `blur(${settings.overlay.blur}px)` : undefined,
  }
  const showPreviewOverlay = Boolean(
    settings.overlay?.enabled && (settings.overlay?.showInPreview ?? true),
  )

  const getPreviewScreenWidthBox = () => {
    const bleed = 6 / previewCanvasScale
    const width = Math.ceil(previewViewport.width / previewCanvasScale + bleed * 2)

    return {
      left: Math.floor((canvas.width - width) / 2),
      width,
    }
  }

  const getElementStyle = (element) => {
    const fullWidth = element.fullWidth
    const screenWidthBox = getPreviewScreenWidthBox()
    const fixedTopY = -Math.round(previewCanvasOffset.y) / previewCanvasScale
    const fixedBottomY =
      (previewViewport.height - Math.round(previewCanvasOffset.y)) / previewCanvasScale
      - element.height

    return {
      left: fullWidth ? screenWidthBox.left : element.x,
      top: element.fixedTop ? fixedTopY : element.fixedBottom ? fixedBottomY : element.y,
      width: fullWidth ? screenWidthBox.width : element.width,
      height: element.height,
      zIndex: element.alwaysVisible || element.popupEnabled ? 9999 : element.zIndex ?? 1,
      borderRadius: element.radius,
      backgroundColor: ['image', 'video', 'text', 'hotspot'].includes(element.type)
        ? undefined
        : element.background,
      color: element.type === 'hotspot' ? 'transparent' : element.color,
      textAlign: element.align,
      fontSize: element.size,
      fontWeight: element.fontWeight ?? 800,
      transform: `rotate(${Number(element.rotation ?? 0) || 0}deg)`,
      transformOrigin: 'center center',
      '--element-height': `${element.height}px`,
      '--element-animation-speed': `${element.speed ?? 1.35}s`,
    }
  }

  const getElementBackdropStyle = (element) => {
    const baseHeight = element.backdropHeight ?? element.height
    const screenWidthBox = getPreviewScreenWidthBox()
    const fixedTopY = -Math.round(previewCanvasOffset.y) / previewCanvasScale
    const fixedBottomEdge =
      (previewViewport.height - Math.round(previewCanvasOffset.y)) / previewCanvasScale
    const backdropY = Number.isFinite(Number(element.backdropY))
      ? Number(element.backdropY)
      : Math.round(element.y + element.height / 2 - baseHeight / 2)
    const top = element.backdropPosition === 'top' || element.backdropPosition === 'screen'
      ? fixedTopY
      : backdropY
    const height = element.backdropPosition === 'bottom'
      ? Math.max(1, fixedBottomEdge - backdropY)
      : element.backdropPosition === 'screen'
        ? Math.max(1, fixedBottomEdge - fixedTopY)
        : element.backdropPosition === 'top'
        ? Math.max(1, backdropY - fixedTopY)
        : baseHeight
    const shadowSize = element.backdropShadowSize ?? 90
    const shadowColor = hexToRgba(
      element.backdropShadowColor ?? '#000000',
      element.backdropShadowOpacity ?? 0.24,
    )
    const shadowEndColor = hexToRgba(
      element.backdropShadowEndColor ?? element.backdropShadowColor ?? '#000000',
      element.backdropShadowEndOpacity ?? 0,
    )

    return {
      left: screenWidthBox.left,
      top,
      width: screenWidthBox.width,
      height,
      zIndex: Math.max(0, (element.alwaysVisible || element.popupEnabled ? 9999 : element.zIndex ?? 1) - 1),
      backgroundColor: element.backdropColor ?? '#202124',
      opacity: element.backdropOpacity ?? 1,
      '--backdrop-shadow-size': element.backdropShadow ? `${shadowSize}px` : undefined,
      '--backdrop-shadow-start': element.backdropShadow ? shadowColor : undefined,
      '--backdrop-shadow-end': element.backdropShadow ? shadowEndColor : undefined,
      backdropFilter: element.backdropBlur ? `blur(${element.backdropBlur}px)` : undefined,
      WebkitBackdropFilter: element.backdropBlur ? `blur(${element.backdropBlur}px)` : undefined,
    }
  }

  const handleExport = async () => {
    try {
      const exportName = sanitizeExportFileName(exportFileName)
      const pageTitle = exportPageTitle.trim() || 'Exported Template'
      const exportSettings = getExportSettings()

      if (exportType === 'single') {
        const exportBundle = await externalizeTemplateAssets(exportSettings, {
          referencePrefix: 'assets/',
          filePrefix: 'assets/',
          convertPngToWebp: exportConvertPngToWebp,
        })

        if (exportBundle.files.length > 0) {
          downloadBlob(
            createZip([
              {
                path: `${exportName}.html`,
                content: buildSingleHtml(exportBundle.settings, pageTitle),
              },
              ...exportBundle.files,
            ]),
            `${exportName}-bundle.zip`,
          )
          return
        }

        downloadBlob(
          new Blob([buildSingleHtml(exportSettings, pageTitle)], { type: 'text/html;charset=utf-8' }),
          `${exportName}.html`,
        )
        return
      }

      const exportBundle = await externalizeTemplateAssets(exportSettings, {
        referencePrefix: './assets/',
        filePrefix: 'src/assets/',
        convertPngToWebp: exportConvertPngToWebp,
      })

      downloadBlob(
        createZip([
          ...buildProjectFiles(exportBundle.settings, exportRuntime, pageTitle),
          ...exportBundle.files,
        ]),
        `${exportName}-project.zip`,
      )
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not export this template.')
    }
  }

  const updateSelectedElementWidth = (width) => {
    if (!selectedConfig) return

    const patch = { width }
    if (selectedConfig.lockAspectRatio && selectedConfig.width > 0 && selectedConfig.height > 0) {
      patch.height = Math.max(1, Math.round(width / (selectedConfig.width / selectedConfig.height)))
    }
    updateElement(selectedConfig.id, patch)
  }

  const updateSelectedElementHeight = (height) => {
    if (!selectedConfig) return

    const patch = { height }
    if (
      selectedConfig.lockAspectRatio
      && !selectedConfig.fullWidth
      && selectedConfig.width > 0
      && selectedConfig.height > 0
    ) {
      patch.width = Math.max(1, Math.round(height * (selectedConfig.width / selectedConfig.height)))
    }
    updateElement(selectedConfig.id, patch)
  }

  const updateInteractionAction = (elementId, action) => {
    updateElement(elementId, {
      mraidClick: action === 'mraid',
      nextSceneClick: action === 'next-scene',
      nextSceneTarget: action === 'next-scene' ? 'next' : undefined,
    })
  }

  const elementSettingsForm = selectedConfig ? (
    <div className="element-settings-form">
      <details className="disclosure-card" open>
        <summary>Interaction</summary>
        <label className="field">
          <span>On click</span>
          <select
            value={selectedNextSceneClick ? 'next-scene' : selectedMraidClick ? 'mraid' : 'none'}
            onChange={(event) => updateInteractionAction(selectedConfig.id, event.target.value)}
          >
            <option value="none">No action</option>
            <option value="next-scene">Show scene</option>
            <option value="mraid">MRAID click</option>
          </select>
        </label>
        {selectedNextSceneClick && (
          <label className="field">
            <span>Show</span>
            <select
              value={selectedConfig.nextSceneTarget || 'next'}
              onChange={(event) =>
                updateElement(selectedConfig.id, { nextSceneTarget: event.target.value })
              }
            >
              <option value="next">Next scene</option>
              {scenes.map((scene, index) => (
                <option key={scene.id} value={scene.id}>
                  {scene.name || `Scene ${index + 1}`}
                </option>
              ))}
              {endScene.enabled && (
                <option value={END_SCENE_ID}>{endScene.name || 'End Scene'}</option>
              )}
            </select>
          </label>
        )}
        {selectedMraidClick && (
          <TextControl
            label="Fallback URL"
            value={selectedConfig.link || ''}
            onChange={(link) => updateElement(selectedConfig.id, { link })}
          />
        )}
        {(selectedNextSceneClick || selectedMraidClick) && (
          <>
            <FileDropControl
              label="Interaction SFX"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
              onFile={setSelectedInteractionSfxFile}
              onAsset={(asset) => updateElement(selectedConfig.id, { interactionSfx: asset.src })}
              assetLibrary={assetLibrary}
            />
            {selectedConfig.interactionSfx && (
              <div className="audio-control-row">
                <label className="field range-field">
                  <span>SFX volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedConfig.interactionVolume ?? 1}
                    onChange={(event) =>
                      updateElement(selectedConfig.id, {
                        interactionVolume: Number(event.target.value),
                      })
                    }
                  />
                  <strong>{Math.round((selectedConfig.interactionVolume ?? 1) * 100)}%</strong>
                </label>
                <button
                  type="button"
                  className="secondary-button compact-action"
                  onClick={() => updateElement(selectedConfig.id, { interactionSfx: '' })}
                >
                  Clear
                </button>
              </div>
            )}
          </>
        )}
      </details>

      <div className="option-group">
        <CheckboxControl
          label="Apply to all scenes"
          checked={selectedConfig.applyToAllScenes ?? false}
          onChange={(applyToAllScenes) =>
            setElementApplyToAllScenes(selectedConfig.id, applyToAllScenes)
          }
        />
        <CheckboxControl
          label="Always visible"
          checked={selectedConfig.alwaysVisible ?? false}
          onChange={(alwaysVisible) => updateElement(selectedConfig.id, { alwaysVisible })}
        />
        <CheckboxControl
          label="Visible"
          checked={selectedConfig.visible ?? true}
          onChange={(visible) => updateElement(selectedConfig.id, { visible })}
        />
      </div>
      <NumberControl
        label="Show after seconds"
        min={0}
        step={0.05}
        value={getElementDelaySeconds(selectedConfig)}
        onChange={(showAfterSeconds) => updateElement(selectedConfig.id, { showAfterSeconds })}
      />
      <label className="field">
        <span>Entrance animation</span>
        <select
          value={selectedConfig.entranceAnimation ?? 'fade'}
          onChange={(event) =>
            updateElement(selectedConfig.id, { entranceAnimation: event.target.value })
          }
        >
          {elementEntranceAnimationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <TextControl
        label={['image', 'video'].includes(selectedConfig.type) ? 'Element / asset name' : 'Element name'}
        value={selectedConfig.name || ''}
        onChange={(name) => updateElement(selectedConfig.id, { name })}
      />
      <label className="field">
        <span>Type</span>
        <select
          value={selectedConfig.type}
          onChange={(event) => changeElementType(selectedConfig.id, event.target.value)}
        >
          {elementTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <div className="option-group">
        <CheckboxControl
          label="Follow screen width"
          checked={selectedConfig.fullWidth}
          onChange={(fullWidth) => updateElement(selectedConfig.id, { fullWidth })}
        />
        {!selectedIsFooter && (
          <CheckboxControl
            label="Fixed to top"
            checked={selectedConfig.fixedTop ?? false}
            onChange={(fixedTop) =>
              updateElement(selectedConfig.id, {
                fixedTop,
                fixedBottom: fixedTop ? false : selectedConfig.fixedBottom,
              })
            }
          />
        )}
        <CheckboxControl
          label="Fixed to bottom"
          checked={selectedConfig.fixedBottom ?? false}
          onChange={(fixedBottom) =>
            updateElement(selectedConfig.id, {
              fixedBottom,
              fixedTop: fixedBottom ? false : selectedConfig.fixedTop,
            })
          }
        />
        {!selectedConfig.fullWidth && (
          <CheckboxControl
            label="Lock aspect ratio"
            checked={selectedConfig.lockAspectRatio ?? false}
            onChange={(lockAspectRatio) =>
              updateElement(selectedConfig.id, { lockAspectRatio })
            }
          />
        )}
      </div>

      {selectedConfig.type !== 'hotspot' && (
        <div className="option-group">
          <CheckboxControl
            label="Backdrop"
            checked={selectedConfig.backdropEnabled ?? false}
            onChange={(backdropEnabled) =>
              updateElement(selectedConfig.id, {
                backdropEnabled,
                backdropHeight: selectedConfig.backdropHeight ?? Math.max(selectedConfig.height, 240),
                backdropY: selectedConfig.backdropY ?? selectedConfig.y,
              })
            }
          />
          {selectedConfig.backdropEnabled && (
            <>
            <label className="field">
              <span>Backdrop behavior</span>
              <select
                value={selectedConfig.backdropPosition ?? 'element'}
                onChange={(event) =>
                  updateElement(selectedConfig.id, { backdropPosition: event.target.value })
                }
              >
                <option value="element">Custom height</option>
                <option value="screen">Full screen</option>
                <option value="top">Extend to top</option>
                <option value="bottom">Extend to bottom</option>
              </select>
            </label>
            {selectedConfig.backdropPosition !== 'screen' && (
              <NumberControl
                label={
                  selectedConfig.backdropPosition === 'top'
                    ? 'Bottom edge Y'
                    : 'Top position Y'
                }
                value={selectedConfig.backdropY ?? selectedConfig.y}
                onChange={(backdropY) => updateElement(selectedConfig.id, { backdropY })}
              />
            )}
            <ColorControl
              label="Backdrop color"
              value={selectedConfig.backdropColor ?? '#202124'}
              onChange={(backdropColor) => updateElement(selectedConfig.id, { backdropColor })}
            />
            <label className="field range-field">
              <span>Backdrop opacity</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedConfig.backdropOpacity ?? 1}
                onChange={(event) =>
                  updateElement(selectedConfig.id, {
                    backdropOpacity: Number(event.target.value),
                  })
                }
              />
              <strong>{Math.round((selectedConfig.backdropOpacity ?? 1) * 100)}%</strong>
            </label>
            <label className="field range-field">
              <span>Backdrop blur</span>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={selectedConfig.backdropBlur ?? 0}
                onChange={(event) =>
                  updateElement(selectedConfig.id, {
                    backdropBlur: Number(event.target.value),
                  })
                }
              />
              <strong>{selectedConfig.backdropBlur ?? 0}px</strong>
            </label>
            <CheckboxControl
              label="Shadow"
              checked={selectedConfig.backdropShadow ?? false}
              onChange={(backdropShadow) =>
                updateElement(selectedConfig.id, {
                  backdropShadow,
                  backdropShadowSize: selectedConfig.backdropShadowSize ?? 90,
                  backdropShadowEndColor:
                    selectedConfig.backdropShadowEndColor
                    ?? selectedConfig.backdropShadowColor
                    ?? '#000000',
                  backdropShadowEndOpacity: selectedConfig.backdropShadowEndOpacity ?? 0,
                })
              }
            />
            {selectedConfig.backdropShadow && (
              <>
                <label className="field">
                  <span>Shadow edge</span>
                  <select
                    value={selectedConfig.backdropShadowEdge ?? 'top'}
                    onChange={(event) =>
                      updateElement(selectedConfig.id, { backdropShadowEdge: event.target.value })
                    }
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </label>
                <ColorControl
                  label="Shadow start color"
                  value={selectedConfig.backdropShadowColor ?? '#000000'}
                  onChange={(backdropShadowColor) =>
                    updateElement(selectedConfig.id, { backdropShadowColor })
                  }
                />
                <label className="field range-field">
                  <span>Start opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedConfig.backdropShadowOpacity ?? 0.24}
                    onChange={(event) =>
                      updateElement(selectedConfig.id, {
                        backdropShadowOpacity: Number(event.target.value),
                      })
                    }
                  />
                  <strong>{Math.round((selectedConfig.backdropShadowOpacity ?? 0.24) * 100)}%</strong>
                </label>
                <ColorControl
                  label="Shadow fade color"
                  value={
                    selectedConfig.backdropShadowEndColor
                    ?? selectedConfig.backdropShadowColor
                    ?? '#000000'
                  }
                  onChange={(backdropShadowEndColor) =>
                    updateElement(selectedConfig.id, { backdropShadowEndColor })
                  }
                />
                <label className="field range-field">
                  <span>Fade opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedConfig.backdropShadowEndOpacity ?? 0}
                    onChange={(event) =>
                      updateElement(selectedConfig.id, {
                        backdropShadowEndOpacity: Number(event.target.value),
                      })
                    }
                  />
                  <strong>{Math.round((selectedConfig.backdropShadowEndOpacity ?? 0) * 100)}%</strong>
                </label>
                <NumberControl
                  label="Shadow size"
                  min={0}
                  max={canvas.height}
                  value={selectedConfig.backdropShadowSize ?? 90}
                  onChange={(backdropShadowSize) =>
                    updateElement(selectedConfig.id, { backdropShadowSize })
                  }
                />
              </>
            )}
            {(selectedConfig.backdropPosition ?? 'element') === 'element' && (
              <NumberControl
                label="Backdrop height"
                min={1}
                max={canvas.height}
                value={selectedConfig.backdropHeight ?? selectedConfig.height}
                onChange={(backdropHeight) => updateElement(selectedConfig.id, { backdropHeight })}
              />
            )}
            </>
          )}
        </div>
      )}

      {['div', 'text', 'button'].includes(selectedConfig.type) && (
        <TextControl
          label={selectedConfig.type === 'button' ? 'Button text' : 'Text'}
          value={selectedConfig.text || ''}
          onChange={(text) => updateElement(selectedConfig.id, { text })}
        />
      )}
      {selectedMraidClick && (
        <TextControl
          label="Link URL"
          value={selectedConfig.link || ''}
          onChange={(link) => updateElement(selectedConfig.id, { link })}
        />
      )}
      {['div', 'button'].includes(selectedConfig.type) && (
        <ColorControl
          label={selectedConfig.type === 'button' ? 'Button' : 'Background'}
          value={selectedConfig.background}
          onChange={(background) => updateElement(selectedConfig.id, { background })}
        />
      )}
      {['div', 'text', 'button'].includes(selectedConfig.type) && (
        <ColorControl
          label="Text color"
          value={selectedConfig.color}
          onChange={(color) => updateElement(selectedConfig.id, { color })}
        />
      )}

      {selectedConfig.type === 'image' && (
        <>
          <TextControl
            label="Image URL"
            value={selectedConfig.src || ''}
            onChange={(src) => updateElement(selectedConfig.id, { src })}
          />
          <FileDropControl
            label="Image file"
            accept="image/*"
            onFile={setElementMediaFile}
          />
          <label className="field">
            <span>Image fit</span>
            <select
              value={selectedConfig.fit}
              onChange={(event) => updateElement(selectedConfig.id, { fit: event.target.value })}
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Stretch</option>
            </select>
          </label>
        </>
      )}

      {selectedConfig.type === 'video' && (
        <>
          <TextControl
            label="Video URL"
            value={selectedConfig.src || ''}
            onChange={(src) => updateElement(selectedConfig.id, { src })}
          />
          <FileDropControl
            label="Video file"
            accept="video/*"
            onFile={setElementMediaFile}
          />
          <TextControl
            label="Poster URL"
            value={selectedConfig.poster || ''}
            onChange={(poster) => updateElement(selectedConfig.id, { poster })}
          />
          <FileDropControl
            label="Poster image"
            accept="image/*"
            onFile={setElementPosterFile}
          />
          <label className="field">
            <span>Video fit</span>
            <select
              value={selectedConfig.fit}
              onChange={(event) => updateElement(selectedConfig.id, { fit: event.target.value })}
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Stretch</option>
            </select>
          </label>
          <CheckboxControl
            label="Autoplay"
            checked={selectedConfig.autoplay}
            onChange={(autoplay) => updateElement(selectedConfig.id, { autoplay })}
          />
          <CheckboxControl
            label="Loop"
            checked={selectedConfig.loop}
            onChange={(loop) => updateElement(selectedConfig.id, { loop })}
          />
          <CheckboxControl
            label="Muted"
            checked={selectedConfig.muted}
            onChange={(muted) => updateElement(selectedConfig.id, { muted })}
          />
        </>
      )}

      {selectedConfig.type !== 'hotspot' && (
        <>
          <label className="field">
            <span>Animation</span>
            <select
              value={selectedConfig.animation}
              onChange={(event) => updateElement(selectedConfig.id, { animation: event.target.value })}
            >
              <option value="none">None</option>
              <option value="ping">Ping glow</option>
              <option value="pulse">Pulse scale</option>
              <option value="bounce">Bounce</option>
            </select>
          </label>
          <label className="field range-field">
            <span>Animation speed</span>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.05"
              value={selectedConfig.speed}
              onChange={(event) => updateElement(selectedConfig.id, { speed: Number(event.target.value) })}
            />
            <strong>{(selectedConfig.speed ?? 1.35).toFixed(2)}s</strong>
          </label>
        </>
      )}

      {selectedConfig.fullWidth ? (
        <div className="compact-grid">
          {!selectedConfig.fixedTop && !selectedConfig.fixedBottom && (
            <NumberControl
              label="Y"
              value={selectedConfig.y}
              onChange={(y) => updateElement(selectedConfig.id, { y })}
            />
          )}
          <NumberControl
            label="Height"
            min={1}
            value={selectedConfig.height}
            onChange={updateSelectedElementHeight}
          />
          <NumberControl
            label="Z index"
            min={0}
            max={999}
            value={selectedConfig.zIndex ?? 1}
            onChange={(zIndex) => updateElement(selectedConfig.id, { zIndex })}
          />
          <NumberControl
            label="Rotation"
            min={-360}
            max={360}
            step={1}
            value={selectedConfig.rotation ?? 0}
            onChange={(rotation) => updateElement(selectedConfig.id, { rotation })}
          />
        </div>
      ) : (
        <div className="compact-grid">
          <NumberControl
            label="X"
            value={selectedConfig.x}
            onChange={(x) => updateElement(selectedConfig.id, { x })}
          />
          {!selectedConfig.fixedTop && !selectedConfig.fixedBottom && (
            <NumberControl
              label="Y"
              value={selectedConfig.y}
              onChange={(y) => updateElement(selectedConfig.id, { y })}
            />
          )}
          <NumberControl
            label="Width"
            min={1}
            value={selectedConfig.width}
            onChange={updateSelectedElementWidth}
          />
          <NumberControl
            label="Height"
            min={1}
            value={selectedConfig.height}
            onChange={updateSelectedElementHeight}
          />
          <NumberControl
            label="Z index"
            min={0}
            max={999}
            value={selectedConfig.zIndex ?? 1}
            onChange={(zIndex) => updateElement(selectedConfig.id, { zIndex })}
          />
          <NumberControl
            label="Rotation"
            min={-360}
            max={360}
            step={1}
            value={selectedConfig.rotation ?? 0}
            onChange={(rotation) => updateElement(selectedConfig.id, { rotation })}
          />
        </div>
      )}

      {['div', 'text', 'button'].includes(selectedConfig.type) && (
        <>
          <label className="field">
            <span>Position</span>
            <select
              value={selectedConfig.align}
              onChange={(event) => updateElement(selectedConfig.id, { align: event.target.value })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <NumberControl
            label="Font size"
            min={10}
            max={120}
            value={selectedConfig.size}
            onChange={(size) => updateElement(selectedConfig.id, { size })}
          />
          <label className="field">
            <span>Font style</span>
            <select
              value={selectedConfig.fontWeight ?? 800}
              onChange={(event) =>
                updateElement(selectedConfig.id, { fontWeight: Number(event.target.value) })
              }
            >
              <option value={400}>Normal</option>
              <option value={500}>Medium</option>
              <option value={600}>Semi bold</option>
              <option value={700}>Bold</option>
              <option value={800}>Extra bold</option>
              <option value={900}>Black</option>
            </select>
          </label>
        </>
      )}

      {['div', 'button', 'hotspot', 'image', 'video'].includes(selectedConfig.type) && (
        <NumberControl
          label="Corner radius"
          min={0}
          max={120}
          value={selectedConfig.radius}
          onChange={(radius) => updateElement(selectedConfig.id, { radius })}
        />
      )}
    </div>
  ) : null

  const shouldShowPreviewElement = (element) => {
    if (element.visible === false) return false
    if (!isPreviewPlaying) return true

    return previewElapsedSeconds >= getElementDelaySeconds(element)
  }

  const getPreviewEntranceClass = (element) => {
    if (!isPreviewPlaying || getElementDelaySeconds(element) <= 0) return ''
    const entranceAnimation = element.entranceAnimation ?? 'fade'

    return entranceAnimation === 'none' ? '' : `entrance-${entranceAnimation}`
  }

  const goToPreviewSceneTarget = (target = 'next') => {
    if (target === END_SCENE_ID) {
      if (endScene.enabled && (endScene.html || endScene.src)) {
        playPreviewSceneChangeSfx()
        stopPreviewBackgroundMusic()
        setIsPreviewEndSceneVisible(true)
      }
      return
    }

    const currentIndex = scenes.findIndex((scene) => scene.id === activeSceneId)
    const nextScene = target === 'next'
      ? scenes[currentIndex + 1]
      : scenes.find((scene) => scene.id === target)

    if (!nextScene) {
      if (endScene.enabled && (endScene.html || endScene.src)) {
        playPreviewSceneChangeSfx()
        stopPreviewBackgroundMusic()
        setIsPreviewEndSceneVisible(true)
      }
      return
    }

    playPreviewSceneChangeSfx()
    loadScene(nextScene.id)
  }

  const renderPreviewElement = (element) => {
    if (!shouldShowPreviewElement(element)) return null

    return (
    <Fragment key={element.id}>
      {element.backdropEnabled && (
        <div
          className={[
            'element-backdrop',
            'screen-width',
            element.backdropShadow ? 'backdrop-shadow' : '',
            element.backdropShadow
              ? `backdrop-shadow-${element.backdropShadowEdge === 'bottom' ? 'bottom' : 'top'}`
              : '',
            getPreviewEntranceClass(element),
          ].filter(Boolean).join(' ')}
          style={getElementBackdropStyle(element)}
          aria-hidden="true"
        />
      )}
      <div
      className={[
        'draggable',
        'template-element',
        getElementRole(element) === 'header' ? 'template-header' : '',
        getElementRole(element) === 'cta' ? 'template-cta' : '',
        `role-${getElementRole(element)}`,
        `element-${element.type}`,
        `align-${element.align ?? 'center'}`,
        `animation-${element.animation ?? 'none'}`,
        element.fullWidth ? 'screen-width' : '',
        element.fixedTop ? 'fixed-top' : '',
        element.fixedBottom ? 'fixed-bottom' : '',
        element.popupEnabled ? 'popup-element' : '',
        getPreviewEntranceClass(element),
        !isPreviewPlaying && selectedElement === element.id ? 'selected' : '',
      ].filter(Boolean).join(' ')}
      style={getElementStyle(element)}
      data-popup-element={element.popupEnabled ? 'true' : undefined}
      data-next-scene-click={element.nextSceneClick ? 'true' : undefined}
      data-scene-target={element.nextSceneClick ? element.nextSceneTarget || 'next' : undefined}
      data-mraid-click={element.mraidClick || getElementRole(element) === 'cta' ? 'true' : undefined}
      data-link={element.link || undefined}
      data-interaction-label={element.type === 'hotspot' ? 'Interaction' : undefined}
      onPointerDown={(event) => {
        if (!isPreviewPlaying) startDrag(event, element.id)
      }}
      onDoubleClick={() => {
        if (!isPreviewPlaying) openElementSettings(element.id)
      }}
      onClick={(event) => {
        if (!isPreviewPlaying || (!element.nextSceneClick && !element.mraidClick)) return

        event.preventDefault()
        event.stopPropagation()
        playPreviewInteractionSfx(element)
        if (element.nextSceneClick) {
          goToPreviewSceneTarget(element.nextSceneTarget || 'next')
        }
      }}
    >
      {element.type === 'image' ? (
        element.src ? (
          <img
            src={element.src}
            alt={element.name || 'Image'}
            style={{ objectFit: element.fit ?? 'contain' }}
          />
        ) : (
          <strong>Image</strong>
        )
      ) : element.type === 'video' ? (
        element.src ? (
          <video
            src={element.src}
            poster={element.poster || undefined}
            autoPlay={element.autoplay}
            loop={element.loop}
            muted={element.muted}
            playsInline
            style={{ objectFit: element.fit ?? 'cover' }}
          />
        ) : (
          <strong>Video</strong>
        )
      ) : (
        <>
          {element.animation === 'ping' && <span className="ping" aria-hidden="true" />}
          <span className="element-text-content">{element.text}</span>
        </>
      )}
      {!isPreviewPlaying && selectedElement === element.id && (
        <ResizeHandles
          onResizeStart={(event, handle) => startResize(event, element.id, handle)}
        />
      )}
      </div>
    </Fragment>
    )
  }

  return (
    <main className={`builder-shell theme-${themeMode}`}>
      <aside className="asset-panel" aria-label="Asset library">
        <section className="panel-section">
          <div className="manager-header">
            <div>
              <p className="eyebrow">Assets</p>
              <span>{assetLibrary.length} reusable</span>
            </div>
          </div>
          <label className="field file-drop-field">
            <span>Upload assets</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              onChange={(event) => {
                const files = event.target.files
                if (files?.length) {
                  void addAssetLibraryFiles(files).catch((error) => {
                    window.alert(error instanceof Error ? error.message : 'Could not add these assets.')
                  })
                }
                event.target.value = ''
              }}
            />
          </label>
          {assetLibrary.length > 0 ? (
            <div className="asset-library-list">
              {assetLibrary.map((asset) => (
                <div
                  key={asset.id}
                  className="asset-library-item"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'copy'
                    event.dataTransfer.setData('application/x-template-asset-id', asset.id)
                    event.dataTransfer.setData('text/plain', asset.name)
                  }}
                >
                  <button
                    type="button"
                    className="asset-preview-button"
                    onClick={() =>
                      asset.type === 'audio'
                        ? playPreviewAudio(asset.src, 1, 'Asset preview')
                        : addAssetToScene(asset)
                    }
                    title={asset.type === 'audio' ? 'Preview sound' : 'Add to scene'}
                  >
                    {asset.type === 'image' ? (
                      <img src={asset.src} alt="" />
                    ) : asset.type === 'video' ? (
                      <video src={asset.src} muted playsInline />
                    ) : (
                      <span className="asset-audio-preview">SFX</span>
                    )}
                  </button>
                  <div className="asset-library-meta">
                    <input
                      type="text"
                      className="asset-name-input"
                      value={asset.name}
                      onChange={(event) => renameAssetLibraryItem(asset.id, event.target.value)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onDragStart={(event) => event.preventDefault()}
                      aria-label={`Rename ${asset.name}`}
                    />
                    <small>{asset.type}</small>
                  </div>
                  <button
                    type="button"
                    className="asset-remove-button"
                    onClick={() =>
                      setAssetLibrary((current) => current.filter((item) => item.id !== asset.id))
                    }
                    aria-label={`Remove ${asset.name}`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="template-note">
              Upload images, videos, or sounds once, then drag them where you need them.
            </p>
          )}
        </section>
      </aside>
      <aside className="control-panel" aria-label="Template controls">
        <section className="panel-section">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Template</p>
              <h1>Template Builder</h1>
              <p className="panel-subtitle">Configure elements, then export a self-contained build.</p>
            </div>
            <button
              type="button"
              className="theme-toggle-button"
              aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={() => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {themeMode === 'dark' ? '\u263e' : '\u2600'}
            </button>
          </div>
          <div className="scene-manager">
            <div className="manager-header">
              <div>
                <p className="control-label">Scenes</p>
                <span>{scenes.length + (endScene.enabled ? 1 : 0)} total</span>
              </div>
              <button type="button" className="secondary-button compact-action" onClick={addScene}>
                Add
              </button>
            </div>
            <div className="scene-list" aria-label="Scenes">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  type="button"
                  className={scene.id === activeSceneId ? 'active' : ''}
                  onClick={() => loadScene(scene.id)}
                >
                  <strong>{index + 1}</strong>
                  <span>{scene.name || `Scene ${index + 1}`}</span>
                  <small>
                    {scene.id === firstSceneId
                      ? 'First'
                      : getSceneAutoShowNext(scene)
                        ? `Auto ${getSceneDelaySeconds(scene, 0).toFixed(2)}s`
                        : 'Manual'}
                  </small>
                </button>
              ))}
              {endScene.enabled && (
                <button
                  key={END_SCENE_ID}
                  type="button"
                  className={isEndSceneActive ? 'active' : ''}
                  onClick={() => loadScene(END_SCENE_ID)}
                >
                  <strong>END</strong>
                  <span>{endScene.name || 'End Scene'}</span>
                  <small>{Number(endScene.delaySeconds ?? 0.95).toFixed(2)}s</small>
                </button>
              )}
            </div>
            <div className="selected-manager-card">
              <TextControl
                label={isEndSceneActive ? 'End scene name' : 'Scene name'}
                value={isEndSceneActive ? endScene.name : activeScene?.name || ''}
                onChange={(name) =>
                  isEndSceneActive
                    ? updateEndScene({ name })
                    : renameActiveScene(name)
                }
              />
              {!isEndSceneActive && (
                <>
                <div className="compact-grid">
                  <CheckboxControl
                    label="First scene"
                    checked={isActiveFirstScene}
                    onChange={(startScene) => {
                      if (startScene) markActiveSceneAsFirst()
                    }}
                  />
                  <CheckboxControl
                    label="Auto show next"
                    checked={getSceneAutoShowNext(activeScene)}
                    onChange={(autoShowNext) => updateActiveSceneMeta({ autoShowNext })}
                  />
                  {getSceneAutoShowNext(activeScene) && (
                    <NumberControl
                      label="After seconds"
                      min={0}
                      step={0.05}
                      value={getSceneDelaySeconds(activeScene, 0)}
                      onChange={(showAfterSeconds) => updateActiveSceneMeta({ showAfterSeconds })}
                    />
                  )}
                </div>
                <FileDropControl
                  label="Scene change SFX"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                  onFile={setActiveSceneSfxFile}
                  onAsset={(asset) => updateActiveSceneMeta({ sceneChangeSfx: asset.src })}
                  assetLibrary={assetLibrary}
                />
                {activeScene?.sceneChangeSfx && (
                  <div className="audio-control-row">
                    <label className="field range-field">
                      <span>SFX volume</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={activeScene.sceneChangeVolume ?? 1}
                        onChange={(event) =>
                          updateActiveSceneMeta({ sceneChangeVolume: Number(event.target.value) })
                        }
                      />
                      <strong>{Math.round((activeScene.sceneChangeVolume ?? 1) * 100)}%</strong>
                    </label>
                    <button
                      type="button"
                      className="secondary-button compact-action"
                      onClick={() => updateActiveSceneMeta({ sceneChangeSfx: '' })}
                    >
                      Clear
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
            <div className="scene-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={addEndScene}
                disabled={endScene.enabled && isEndSceneActive}
              >
                Add end scene
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={duplicateScene}
                disabled={isEndSceneActive}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="secondary-button danger-button"
                onClick={isEndSceneActive ? removeEndScene : removeScene}
                disabled={!isEndSceneActive && scenes.length <= 1}
              >
                Remove
              </button>
            </div>
          </div>
          <details className="disclosure-card">
            <summary>Import</summary>
            <label className="field">
              <span>Import HTML or zip</span>
              <input
                type="file"
                accept=".html,.zip,text/html,application/zip"
                onChange={handleImportTemplateFile}
              />
            </label>
            <label className="field">
              <span>Import project folder</span>
              <input
                type="file"
                multiple
                webkitdirectory="true"
                onChange={handleImportProjectFolder}
              />
            </label>
          </details>
        </section>

        <section className="panel-section">
          <p className="eyebrow">Export</p>
          <details className="disclosure-card">
            <summary>Export settings</summary>
            <TextControl
              label="Export file name"
              value={exportFileName}
              onChange={setExportFileName}
            />
            <TextControl
              label="Page title"
              value={exportPageTitle}
              onChange={setExportPageTitle}
            />
            <div className="segmented">
              <button
                type="button"
                className={exportType === 'single' ? 'active' : ''}
                onClick={() => setExportType('single')}
              >
                <IconMark>HTML</IconMark>
                Single HTML
              </button>
              <button
                type="button"
                className={exportType === 'project' ? 'active' : ''}
                onClick={() => setExportType('project')}
              >
                <IconMark>ZIP</IconMark>
                Project Folder
              </button>
            </div>
            <div className="segmented">
              <button
                type="button"
                className={exportRuntime === 'javascript' ? 'active' : ''}
                onClick={() => setExportRuntime('javascript')}
              >
                <IconMark>JS</IconMark>
                JavaScript
              </button>
              <button
                type="button"
                className={exportRuntime === 'react' ? 'active' : ''}
                onClick={() => setExportRuntime('react')}
              >
                <IconMark>R</IconMark>
                React
              </button>
            </div>
            <CheckboxControl
              label="Convert PNG images to WebP"
              checked={exportConvertPngToWebp}
              onChange={setExportConvertPngToWebp}
            />
          </details>
          <button
            type="button"
            className="export-button"
            onClick={handleExport}
          >
            <IconMark>DL</IconMark>
            Export
          </button>
        </section>

        {isEndSceneActive && (
          <section className="panel-section">
            <p className="eyebrow">End Scene</p>
            <FileDropControl
              label="Upload HTML"
              accept=".html,text/html"
              onFile={setEndSceneFile}
            />
            <TextControl
              label="MRAID click URL"
              value={endScene.clickUrl}
              onChange={(clickUrl) => updateEndScene({ clickUrl })}
            />
            <label className="field">
              <span>Animation</span>
              <select
                value={endScene.animation || 'slide-right'}
                onChange={(event) => updateEndScene({ animation: event.target.value })}
              >
                {endSceneAnimationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <CheckboxControl
              label="Show automatically on export"
              checked={endScene.showOnLoad}
              onChange={(showOnLoad) => updateEndScene({ showOnLoad })}
            />
            <NumberControl
              label="Show after seconds"
              min={0}
              step={0.05}
              value={endScene.delaySeconds}
              onChange={(delaySeconds) => updateEndScene({ delaySeconds })}
            />
            <button
              type="button"
              className="secondary-button danger-button"
              onClick={removeEndScene}
            >
              Remove end scene
            </button>
          </section>
        )}

        {!isEndSceneActive && (
          <>
            <section className="panel-section">
              <p className="eyebrow">Canvas</p>
              <div className="canvas-fields">
                <NumberControl
                  label="Width"
                  min={240}
                  max={2400}
                  value={canvas.width}
                  onChange={(width) => setCanvasSize(width, canvas.height)}
                />
                <NumberControl
                  label="Height"
                  min={240}
                  max={2400}
                  value={canvas.height}
                  onChange={(height) => setCanvasSize(canvas.width, height)}
                />
              </div>
              <details className="disclosure-card">
                <summary>Scale position</summary>
                <div className="segmented segmented-3">
                  <button
                    type="button"
                    className={canvas.scalePosition === 'top' ? 'active' : ''}
                    onClick={() => updateSection('canvas', { scalePosition: 'top' })}
                  >
                    <IconMark>TOP</IconMark>
                    Top
                  </button>
                  <button
                    type="button"
                    className={canvas.scalePosition === 'center' ? 'active' : ''}
                    onClick={() => updateSection('canvas', { scalePosition: 'center' })}
                  >
                    <IconMark>MID</IconMark>
                    Center
                  </button>
                  <button
                    type="button"
                    className={canvas.scalePosition === 'bottom' ? 'active' : ''}
                    onClick={() => updateSection('canvas', { scalePosition: 'bottom' })}
                  >
                    <IconMark>BOT</IconMark>
                    Bottom
                  </button>
                </div>
              </details>
            </section>

            <section className="panel-section">
              <details className="disclosure-card">
                <summary>Reference image</summary>
              <FileDropControl
                label="Import image"
                accept="image/*"
                onFile={setReferenceImageFile}
              />
              <label className="field range-field">
                <span>Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={referenceImage.opacity}
                  onChange={(event) =>
                    updateReferenceImage((current) => ({
                      ...current,
                      opacity: Number(event.target.value),
                    }))
                  }
                />
                <strong>{Math.round(referenceImage.opacity * 100)}%</strong>
              </label>
              <label className="field range-field">
                <span>Scale</span>
                <input
                  type="range"
                  min="0.25"
                  max="3"
                  step="0.01"
                  value={referenceImage.scale ?? 1}
                  onChange={(event) =>
                    updateReferenceImage((current) => ({
                      ...current,
                      scale: Number(event.target.value),
                    }))
                  }
                />
                <strong>{Math.round((referenceImage.scale ?? 1) * 100)}%</strong>
              </label>
              <p className="control-label">Fit mode</p>
              <div className="segmented">
                <button
                  type="button"
                  className={(referenceImage.fit ?? 'cover') === 'cover' ? 'active' : ''}
                  onClick={() => updateReferenceImage((current) => ({ ...current, fit: 'cover' }))}
                >
                  <IconMark>F</IconMark>
                  Fill
                </button>
                <button
                  type="button"
                  className={referenceImage.fit === 'contain' ? 'active' : ''}
                  onClick={() => updateReferenceImage((current) => ({ ...current, fit: 'contain' }))}
                >
                  <IconMark>FIT</IconMark>
                  Fit
                </button>
              </div>
              <p className="control-label">Fit position</p>
              <div className="segmented segmented-3">
                <button
                  type="button"
                  className={referenceImage.position === 'top' ? 'active' : ''}
                  onClick={() => updateReferenceImage((current) => ({ ...current, position: 'top' }))}
                >
                  <IconMark>TOP</IconMark>
                  Top
                </button>
                <button
                  type="button"
                  className={(referenceImage.position ?? 'center') === 'center' ? 'active' : ''}
                  onClick={() => updateReferenceImage((current) => ({ ...current, position: 'center' }))}
                >
                  <IconMark>MID</IconMark>
                  Center
                </button>
                <button
                  type="button"
                  className={referenceImage.position === 'bottom' ? 'active' : ''}
                  onClick={() => updateReferenceImage((current) => ({ ...current, position: 'bottom' }))}
                >
                  <IconMark>BOT</IconMark>
                  Bottom
                </button>
              </div>
              {referenceImage.src && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => updateReferenceImage((current) => ({ ...current, src: '' }))}
                >
                  <IconMark>X</IconMark>
                  Clear Reference
                </button>
              )}
              </details>
            </section>

            <section className="panel-section">
              <p className="eyebrow">Background</p>
          <ColorControl
            label="Color"
            value={settings.background.color}
            onChange={(color) => updateSection('background', { color })}
          />
          <TextControl
            label="Image URL"
            value={settings.background.image}
            onChange={(image) => updateSection('background', { image })}
          />
          <FileDropControl
            label="Image file"
            accept="image/*"
            onFile={setBackgroundImageFile}
          />
          {settings.background.image && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => updateSection('background', { image: '' })}
            >
              Clear image
            </button>
          )}
          <details className="disclosure-card">
            <summary>Background details</summary>
            <label className="field range-field">
              <span>Opacity</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.background.opacity ?? 1}
                onChange={(event) =>
                  updateSection('background', { opacity: Number(event.target.value) })
                }
              />
              <strong>{Math.round((settings.background.opacity ?? 1) * 100)}%</strong>
            </label>
            <label className="field">
              <span>Image fit</span>
              <select
                value={settings.background.fit}
                onChange={(event) => updateSection('background', { fit: event.target.value })}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="stretch">Stretch</option>
              </select>
            </label>
          </details>
        </section>

        <section className="panel-section">
          <p className="eyebrow">Audio</p>
          <FileDropControl
            label="Background music"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
            onFile={(file) => setAudioFile('backgroundMusic', file)}
            onAsset={(asset) => updateAudioSettings({ backgroundMusic: asset.src })}
            assetLibrary={assetLibrary}
          />
          {audioSettings.backgroundMusic && (
            <>
              <div className="audio-control-row">
                <label className="field range-field">
                  <span>Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioSettings.backgroundVolume}
                    onChange={(event) =>
                      updateAudioSettings({ backgroundVolume: Number(event.target.value) })
                    }
                  />
                  <strong>{Math.round(audioSettings.backgroundVolume * 100)}%</strong>
                </label>
                <button
                  type="button"
                  className="secondary-button compact-action"
                  onClick={() => updateAudioSettings({ backgroundMusic: '' })}
                >
                  Clear
                </button>
              </div>
              <CheckboxControl
                label="Loop background music"
                checked={audioSettings.backgroundLoop}
                onChange={(backgroundLoop) => updateAudioSettings({ backgroundLoop })}
              />
            </>
          )}
          <p className="template-note">
            Background music starts after the first tap or click.
          </p>
        </section>

        <section className="panel-section">
          <div className="manager-header">
            <div>
              <p className="eyebrow">Interactions</p>
              <span>{interactionElements.length} active</span>
            </div>
            <button
              type="button"
              className="secondary-button compact-action"
              onClick={() => addElement('hotspot')}
            >
              Add area
            </button>
          </div>
          {interactionElements.length > 0 ? (
            <div className="interaction-list">
              {interactionElements.map((element) => {
                const elementIndex = activeLayerElements.findIndex((item) => item.id === element.id)
                const actionValue = element.nextSceneClick
                  ? 'next-scene'
                  : element.mraidClick
                    ? 'mraid'
                    : 'none'
                const targetValue = element.nextSceneTarget || 'next'

                return (
                  <div
                    key={element.id}
                    className={`interaction-item ${selectedElement === element.id ? 'active' : ''}`}
                  >
                    <div className="interaction-item-header">
                      <strong>{elementIndex + 1}</strong>
                      <div>
                        <span>{element.name || 'Click area'}</span>
                        <small>{element.type === 'hotspot' ? 'Click area' : element.type}</small>
                      </div>
                      <button
                        type="button"
                        className="secondary-button compact-action"
                        onClick={() => openElementSettings(element.id)}
                      >
                        Edit
                      </button>
                    </div>
                    <label className="field compact-field">
                      <span>Action</span>
                      <select
                        value={actionValue}
                        onChange={(event) =>
                          updateInteractionAction(element.id, event.target.value)
                        }
                      >
                        <option value="next-scene">Show scene</option>
                        <option value="mraid">MRAID click</option>
                        <option value="none">No click action</option>
                      </select>
                    </label>
                    {actionValue === 'next-scene' && (
                      <label className="field compact-field">
                        <span>Show</span>
                        <select
                          value={targetValue}
                          onChange={(event) =>
                            updateElement(element.id, { nextSceneTarget: event.target.value })
                          }
                        >
                          <option value="next">Next scene</option>
                          {scenes.map((scene, sceneIndex) => (
                            <option key={scene.id} value={scene.id}>
                              {scene.name || `Scene ${sceneIndex + 1}`}
                            </option>
                          ))}
                          {endScene.enabled && (
                            <option value={END_SCENE_ID}>{endScene.name || 'End Scene'}</option>
                          )}
                        </select>
                      </label>
                    )}
                    <div className="interaction-control-grid">
                      <NumberControl
                        label="Show after"
                        min={0}
                        step={0.05}
                        value={getElementDelaySeconds(element)}
                        onChange={(showAfterSeconds) =>
                          updateElement(element.id, { showAfterSeconds })
                        }
                      />
                      <CheckboxControl
                        label="Visible"
                        checked={element.visible ?? true}
                        onChange={(visible) => updateElement(element.id, { visible })}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="template-note">
              Add a click area or enable an element action.
            </p>
          )}
        </section>

        <section className="panel-section">
          <div className="manager-header">
            <div>
              <p className="eyebrow">Elements</p>
              <span>{activeLayerElements.length} in this scene</span>
            </div>
            <button
              type="button"
              className="secondary-button compact-action"
              onClick={() => addElement()}
            >
              Add
            </button>
          </div>
          {selectedConfig && (
            <div className="element-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => openElementSettings(selectedConfig.id)}
              >
                Settings
            </button>
              <button
                type="button"
                className="secondary-button"
                onClick={duplicateElement}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="secondary-button danger-button"
                onClick={removeElement}
              >
                Remove
              </button>
            </div>
          )}
          {activeLayerElements.length > 0 && (
            <div className="element-list">
              {activeLayerElements.map((element, index) => (
                <button
                  key={element.id}
                  type="button"
                  className={selectedElement === element.id ? 'active' : ''}
                  onClick={() => openElementSettings(element.id)}
                >
                  <strong>{index + 1}</strong>
                  <span>{element.name || element.type}</span>
                  <small>
                    {element.applyToAllScenes
                      ? 'All scenes'
                      : element.nextSceneClick
                      ? 'Next scene'
                      : element.mraidClick
                      ? 'MRAID'
                      : getElementRole(element) === 'regular'
                        ? element.type
                        : getElementRole(element)}
                  </small>
                </button>
              ))}
            </div>
          )}
          {activeLayerElements.length === 0 && (
            <p className="template-note">
              Add an element to begin editing.
            </p>
          )}

        </section>
          </>
        )}
      </aside>

      {isElementModalOpen && selectedConfig && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="element-modal"
            role="dialog"
            aria-label="Element settings"
            style={{
              left: elementModalPosition.x,
              top: elementModalPosition.y,
            }}
          >
            <div className="modal-header" onPointerDown={startElementModalDrag}>
              <div>
                <p className="eyebrow">Element Settings</p>
                <h2>{selectedConfig.name || 'Element'}</h2>
              </div>
              <div className="modal-header-actions">
                <button
                  type="button"
                  className="reset-button danger-button"
                  onClick={removeElement}
                >
                  <IconMark>DEL</IconMark>
                  Delete
                </button>
                <button
                  type="button"
                  className="reset-button"
                  onClick={() => setIsElementModalOpen(false)}
                >
                  <IconMark>OK</IconMark>
                  Done
                </button>
              </div>
            </div>
            {elementSettingsForm}
          </section>
        </div>
      )}

      <section className="preview-panel" aria-label="Template preview">
        <div className="preview-toolbar">
          <div className="preview-header-controls" aria-label="Device preview controls">
            <label className="preview-select">
              <span>Preview</span>
              <select
                value={previewPreset}
                onChange={(event) => applyPreviewPreset(event.target.value)}
              >
                <optgroup label="Standard">
                  {devicePresets.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <div className="preview-orientation">
              <button
                type="button"
                onClick={() =>
                  applyPreviewOrientation(
                    previewOrientation === 'portrait' ? 'landscape' : 'portrait',
                  )
                }
              >
                Change orientation
              </button>
            </div>
          </div>
          <div className="preview-toolbar-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={isPreviewPlaying ? stopPreviewPlayback : startPreviewPlayback}
            >
              <IconMark>{isPreviewPlaying ? 'ST' : 'PL'}</IconMark>
              {isPreviewPlaying ? 'Stop' : 'Play'}
            </button>
            <button
              type="button"
              className="reset-button"
            onClick={() => {
              stopPreviewBackgroundMusic()
              const nextSettings = cloneTemplate(templateId, templateEntries)
              const nextReferenceImage = cloneReferenceImage()
              setSettings(nextSettings)
              setReferenceImage(nextReferenceImage)
              saveActiveSceneSettings(nextSettings, nextReferenceImage)
              setSelectedElement(getFirstElementId(nextSettings))
              setActiveLayer('scene')
              setIsElementModalOpen(false)
              setPreviewPreset('iphone-se')
                setPreviewOrientation('portrait')
                setUndoStack([])
              }}
            >
              <IconMark>RS</IconMark>
              Reset
            </button>
          </div>
        </div>

        <div className="preview-stage" ref={previewStageRef}>
          <div className="live-device-preview">
            <div className="device-chrome">
              <strong>{activePreviewName}</strong>
              <div className="device-chrome-actions">
                <button
                  type="button"
                  onClick={undoLastMove}
                  disabled={undoStack.length === 0}
                >
                  <IconMark>UN</IconMark>
                  Undo
                </button>
                <span>
                  {previewViewport.width} x {previewViewport.height}
                </span>
              </div>
            </div>
            <div className="preview-frame" style={frameStyle}>
              <div
                className={`device-viewport ${isDropActive ? 'drop-active' : ''}`}
                style={deviceViewportStyle}
                onDragEnter={handlePreviewDragOver}
                onDragOver={handlePreviewDragOver}
                onDragLeave={handlePreviewDragLeave}
                onDrop={handlePreviewDrop}
              >
                <div
                  className="preview-background-layer"
                  style={previewBackgroundStyle}
                  aria-hidden="true"
                />
                {(isEndSceneActive || isPreviewEndSceneVisible) && (
                  <div className={`preview-end-scene end-scene-${endScene.animation || 'slide-right'}`}>
                    {endScene.html || endScene.src ? (
                      <iframe
                        title={endScene.name || 'End Scene'}
                        src={endScene.html ? undefined : endScene.src || undefined}
                        srcDoc={endScene.html ? injectEndSceneIframeBridge(endScene.html) : undefined}
                      />
                    ) : (
                      <strong>Upload an end scene HTML file</strong>
                    )}
                  </div>
                )}
                <div
                  ref={previewRef}
                  className={`template-canvas ${orientation} ${isPreviewPlaying ? 'is-playing' : 'is-editing'}`}
                  style={canvasStyle}
                >
                {snapGuides.x && <div className="snap-guide snap-guide-x" />}
                {snapGuides.y && <div className="snap-guide snap-guide-y" />}
                {alignmentGuides.x.map((x) => (
                  <div
                    key={`alignment-x-${x}`}
                    className="alignment-guide alignment-guide-x"
                    style={{ left: x }}
                  />
                ))}
                {alignmentGuides.y.map((y) => (
                  <div
                    key={`alignment-y-${y}`}
                    className="alignment-guide alignment-guide-y"
                    style={{ top: y }}
                  />
                ))}

                {sceneElements.map(renderPreviewElement)}
                {showPreviewOverlay && (
                  <div className="preview-overlay-layer" aria-label="Overlay">
                    <div
                      className="preview-overlay-backdrop"
                      style={previewOverlayStyle}
                      aria-hidden="true"
                    />
                    {overlayElements.map(renderPreviewElement)}
                  </div>
                )}

                </div>
                {!isPreviewPlaying && referenceImage.src && (
                  <div
                    className="reference-image-overlay"
                    style={{ opacity: referenceImage.opacity }}
                    aria-hidden="true"
                  >
                    <img
                      src={referenceImage.src}
                      alt=""
                      style={{
                        objectFit: referenceImage.fit ?? 'cover',
                        objectPosition:
                          referenceImage.position === 'top'
                            ? 'center top'
                            : referenceImage.position === 'bottom'
                              ? 'center bottom'
                              : 'center center',
                        transform: `scale(${referenceImage.scale ?? 1})`,
                        transformOrigin:
                          referenceImage.position === 'top'
                            ? 'center top'
                            : referenceImage.position === 'bottom'
                              ? 'center bottom'
                              : 'center center',
                      }}
                    />
                  </div>
                )}
                {isDropActive && (
                  <div className="drop-target-overlay" aria-hidden="true">
                    <span>Drop to add</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
