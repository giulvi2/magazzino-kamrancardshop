// Legge un'immagine scelta dal telefono (foto o screenshot del QR) e la rimpicciolisce
// prima di salvarla nel localStorage, che ha poco spazio (circa 5 MB su Safari).
// Restituisce un "data URL" JPEG da usare direttamente in <img src>.
export function leggiImmagine(file, lato = 900) {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scala = Math.min(1, lato / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scala)
      c.height = Math.round(img.height * scala)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff' // sfondo bianco per le immagini trasparenti
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      ok(c.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Immagine non leggibile')) }
    img.src = url
  })
}
