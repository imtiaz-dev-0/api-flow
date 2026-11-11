/**
 * api-flow-client — Official Website Interactive Script
 * Designed for static hosting and cPanel
 */

document.addEventListener('DOMContentLoaded', () => {
  // ─── 1. Theme Toggle (Dark / Light) ──────────────────────────────────────
  const themeToggle = document.getElementById('themeToggle')
  const root = document.documentElement

  // Check saved theme or system preference
  const savedTheme = localStorage.getItem('api-flow-theme')
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light')
  
  root.setAttribute('data-theme', initialTheme)

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = root.getAttribute('data-theme')
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
      root.setAttribute('data-theme', nextTheme)
      localStorage.setItem('api-flow-theme', nextTheme)
    })
  }

  // ─── 2. Mobile Menu ──────────────────────────────────────────────────────
  const mobileMenuBtn = document.getElementById('mobileMenuBtn')
  const navLinks = document.getElementById('navLinks')

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true'
      mobileMenuBtn.setAttribute('aria-expanded', !isExpanded)
      navLinks.classList.toggle('open')
    })

    // Close menu when clicking nav links
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open')
        mobileMenuBtn.setAttribute('aria-expanded', 'false')
      })
    })
  }

  // ─── 3. Install Command Tabs & Copy Button ────────────────────────────────
  const installTabs = document.querySelectorAll('.install-tab')
  const installCode = document.getElementById('installCode')
  const copyInstallBtn = document.getElementById('copyInstallBtn')

  const installCommands = {
    npm: 'npm install api-flow-client',
    pnpm: 'pnpm add api-flow-client',
    yarn: 'yarn add api-flow-client',
    bun: 'bun add api-flow-client'
  }

  let activePkg = 'npm'

  installTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const pkg = tab.getAttribute('data-pkg')
      if (!pkg || !installCommands[pkg]) return

      activePkg = pkg
      installTabs.forEach(t => {
        t.classList.remove('active')
        t.setAttribute('aria-selected', 'false')
      })
      tab.classList.add('active')
      tab.setAttribute('aria-selected', 'true')

      if (installCode) {
        installCode.textContent = installCommands[pkg]
      }
    })
  })

  if (copyInstallBtn) {
    copyInstallBtn.addEventListener('click', async () => {
      const textToCopy = installCommands[activePkg] || 'npm install api-flow-client'
      try {
        await navigator.clipboard.writeText(textToCopy)
        copyInstallBtn.classList.add('copied')
        setTimeout(() => copyInstallBtn.classList.remove('copied'), 2000)
      } catch (err) {
        fallbackCopyTextToClipboard(textToCopy, copyInstallBtn)
      }
    })
  }

  // ─── 4. Copy PayPal Link Button ──────────────────────────────────────────
  const copyPaypalBtn = document.getElementById('copyPaypalBtn')
  if (copyPaypalBtn) {
    copyPaypalBtn.addEventListener('click', async () => {
      const paypalLink = 'https://paypal.me/imtiaz579'
      try {
        await navigator.clipboard.writeText(paypalLink)
        const btnText = copyPaypalBtn.querySelector('span')
        if (btnText) {
          const original = btnText.textContent
          btnText.textContent = 'Copied Link! ✓'
          setTimeout(() => { btnText.textContent = original }, 2000)
        }
      } catch (err) {
        fallbackCopyTextToClipboard(paypalLink)
      }
    })
  }

  // ─── 5. Code Showcase Tabs ────────────────────────────────────────────────
  const codeTabs = document.querySelectorAll('.code-tab')
  const codePanels = document.querySelectorAll('.code-panel')

  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabTarget = tab.getAttribute('data-tab')
      if (!tabTarget) return

      codeTabs.forEach(t => t.classList.remove('active'))
      codePanels.forEach(p => p.classList.remove('active'))

      tab.classList.add('active')
      const targetPanel = document.getElementById(`tab-${tabTarget}`)
      if (targetPanel) {
        targetPanel.classList.add('active')
      }
    })
  })

  // ─── 6. Interactive Network Simulator ────────────────────────────────────
  const simButtons = document.querySelectorAll('.sim-btn')
  const simOutput = document.getElementById('simOutput')
  const clearSimLog = document.getElementById('clearSimLog')

  function getTimestamp() {
    const now = new Date()
    return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0')
  }

  function appendLog(level, htmlContent) {
    if (!simOutput) return
    const row = document.createElement('div')
    row.className = 'log-entry'
    row.innerHTML = `<span class="log-time">[${getTimestamp()}]</span> <span class="log-${level}">${htmlContent}</span>`
    simOutput.appendChild(row)
    simOutput.scrollTop = simOutput.scrollHeight
  }

  // Initial greeting log
  if (simOutput) {
    appendLog('info', '<strong>[api-flow v1.1.1]</strong> Client initialized. Ready to execute requests.')
  }

  if (clearSimLog && simOutput) {
    clearSimLog.addEventListener('click', () => {
      simOutput.innerHTML = ''
      appendLog('info', 'Debugger console cleared.')
    })
  }

  let isSimulating = false

  simButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (isSimulating) return
      const action = btn.getAttribute('data-action')

      simButtons.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')

      isSimulating = true
      try {
        if (action === 'get') {
          await runGetSimulation()
        } else if (action === 'cache') {
          await runCacheSimulation()
        } else if (action === 'auth') {
          await runAuthSimulation()
        } else if (action === 'retry') {
          await runRetrySimulation()
        }
      } finally {
        isSimulating = false
      }
    })
  })

  // Simulator Scenario 1: Standard GET
  async function runGetSimulation() {
    appendLog('info', `&rarr; GET /v1/users (fresh request)`)
    await sleep(80)
    appendLog('info', `Deduplication check: 0 in-flight requests. Dispatching via native Fetch...`)
    await sleep(100)
    appendLog('success', `&larr; HTTP 200 OK (180ms) — Loaded 3 user records. Stored in Memory LRU cache (TTL: 300,000ms).`)
  }

  // Simulator Scenario 2: Cache Hit
  async function runCacheSimulation() {
    appendLog('info', `&rarr; GET /v1/users (querying cache)`)
    await sleep(15)
    appendLog('success', `<span class="log-tag tag-cache">CACHE HIT</span> Key: "GET:https://api.example.com/v1/users" &bull; Duration: <strong>0ms</strong> (TTL remaining: 298s)`)
  }

  // Simulator Scenario 3: 401 Auth Mutex
  async function runAuthSimulation() {
    appendLog('warn', `&rarr; Concurrent requests: [GET /profile], [GET /notifications], [GET /settings]`)
    await sleep(60)
    appendLog('err', `&larr; HTTP 401 Unauthorized: Access token expired`)
    await sleep(40)
    appendLog('warn', `<span class="log-tag tag-auth">MUTEX LOCK</span> Parking 2 concurrent requests. Triggering exactly ONE token refresh...`)
    await sleep(150)
    appendLog('info', `&rarr; POST /auth/refresh with refreshToken from storage`)
    await sleep(100)
    appendLog('success', `&larr; HTTP 200 OK — Received new access token. Mutex unlocked!`)
    await sleep(60)
    appendLog('success', `&rarr; Replaying 3 queued requests with new token... All returned HTTP 200 OK!`)
  }

  // Simulator Scenario 4: 503 Retry with Jitter
  async function runRetrySimulation() {
    appendLog('info', `&rarr; POST /v1/checkout/process`)
    await sleep(70)
    appendLog('err', `&larr; HTTP 503 Service Unavailable (Gateway Overload)`)
    await sleep(50)
    appendLog('warn', `<span class="log-tag tag-retry">RETRY 1/3</span> Backoff delay: 320ms (Exponential + Jitter)`)
    await sleep(320)
    appendLog('err', `&larr; HTTP 503 Service Unavailable (Attempt 2)`)
    await sleep(50)
    appendLog('warn', `<span class="log-tag tag-retry">RETRY 2/3</span> Backoff delay: 648ms (Exponential + Jitter)`)
    await sleep(350)
    appendLog('success', `&larr; HTTP 200 OK (Recovered!) Order completed successfully.`)
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function fallbackCopyTextToClipboard(text, triggerEl) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      if (triggerEl) {
        triggerEl.classList.add('copied')
        setTimeout(() => triggerEl.classList.remove('copied'), 2000)
      }
    } catch (err) {
      console.error('Fallback copy failed', err)
    }
    document.body.removeChild(textArea)
  }
})
