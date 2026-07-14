if (import.meta.env.MODE === 'android') {
  import('./android/main.js')
} else {
  import('./main.js')
}
