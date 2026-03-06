export default function JobDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Job Detail</h1>
      {/* TODO: fetch job by params.id and render full details + apply button */}
      <p className="mt-2 text-gray-500">Job ID: {params.id}</p>
    </div>
  );
}
