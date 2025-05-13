import ChatUI from "../../components/ChatUI";

export default function ChatPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">Chat with Satchel</h1>
      <ChatUI />
    </main>
  );
}
