import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Сторінку не знайдено. Можливо, компонент перейменували або видалили.</p>
      <p>
        <Link className="btn" href="/uk">
          На головну
        </Link>
      </p>
    </div>
  )
}
