export default function RecruiterJobDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Job Details</h1>
      {/* TODO: edit job, view stats */}
      <p className="text-gray-500">Job ID: {params.id}</p>
    </div>
  );
}
