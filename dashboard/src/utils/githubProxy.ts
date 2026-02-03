export function getSelectedGitHubProxy(): string {
  if (typeof window === 'undefined') return ''

  try {
    if (!window.localStorage) return ''

    const enabled = localStorage.getItem('githubProxyRadioValue') === '1'
    if (!enabled) return ''

    return localStorage.getItem('selectedGitHubProxy') || ''
  } catch {
    return ''
  }
}
