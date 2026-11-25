export default function Placeholder({ title }: { title: string }) {
  return (
    <section className="p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">This screen arrives in a later milestone.</p>
    </section>
  )
}
