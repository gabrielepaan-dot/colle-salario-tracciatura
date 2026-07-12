// Placeholder v1: stessa forma e colore per tutti, solo l'iniziale cambia.
// In futuro, quando l'utente fornirà gli asset personalizzati, questo
// componente potrà scegliere un'immagine per nome invece del cerchio con
// iniziale, senza toccare chi lo usa (stessa interfaccia: solo "nome").
export default function Avatar({ nome, size = 'md' }) {
  const iniziale = nome ? nome.charAt(0).toUpperCase() : '?'
  const dimensioni = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg',
  }[size]

  return (
    <div
      className={`${dimensioni} rounded-full bg-navy text-white flex items-center justify-center font-semibold shrink-0`}
      title={nome}
    >
      {iniziale}
    </div>
  )
}
