import { useState } from "react";

export default function Home() {
  const [partNumber, setPartNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  async function search() {
    setLoading(true);
    const res = await fetch(`/api/part-info?partNumber=${partNumber}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold">CYKParts Panel</h1>

      <input
        className="mt-4 p-3 border w-full rounded"
        placeholder="Parça Numarası"
        value={partNumber}
        onChange={(e) => setPartNumber(e.target.value)}
      />

      <button
        onClick={search}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Ara
      </button>

      {loading && <p className="mt-4">Aranıyor...</p>}

      {data && (
        <pre className="mt-6 p-4 bg-white shadow rounded text-sm whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
