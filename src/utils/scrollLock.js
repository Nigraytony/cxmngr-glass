let lockCount = 0

let saved = null

function getScrollbarWidth() {
  try {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
  } catch (e) {
    return 0
  }
}

export function lockBodyScroll() {
  if (typeof window === 'undefined') return
  if (!document?.body) return

  if (lockCount === 0) {
    const body = document.body
    const scrollbarWidth = getScrollbarWidth()

    saved = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      scrollY: window.scrollY || 0,
    }

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${saved.scrollY}px`
    body.style.width = '100%'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
  }

  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof window === 'undefined') return
  if (!document?.body) return

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return

  const body = document.body
  const restore = saved
  saved = null

  if (!restore) {
    body.style.overflow = ''
    body.style.paddingRight = ''
    body.style.position = ''
    body.style.top = ''
    body.style.width = ''
    return
  }

  body.style.overflow = restore.overflow || ''
  body.style.paddingRight = restore.paddingRight || ''
  body.style.position = restore.position || ''
  body.style.top = restore.top || ''
  body.style.width = restore.width || ''

  try {
    window.scrollTo(0, restore.scrollY || 0)
  } catch (e) {
    // ignore
  }
}

