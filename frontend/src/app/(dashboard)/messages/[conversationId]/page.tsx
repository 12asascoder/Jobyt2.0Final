export default function MessageThreadPage({ params }: { params: { conversationId: string } }) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Conversation</h1>
      {/* TODO: load and render messages for params.conversationId */}
      <p className="text-gray-500">Conversation ID: {params.conversationId}</p>
    </div>
  );
}
