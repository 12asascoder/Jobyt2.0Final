export default function JobApplicationsPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Applications</h1>
      {/* TODO: list applications for job params.id with ATS status controls */}
      <p className="text-gray-500">Applications for job: {params.id}</p>
    </div>
  );
}
