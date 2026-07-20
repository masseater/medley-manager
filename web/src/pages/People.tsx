import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Person } from "../api";

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<Person[]>(`/people?q=${encodeURIComponent(q)}`).then(setPeople).catch(console.error);
  }, [q]);

  return (
    <div>
      <h1>担当者一覧</h1>
      <div className="filter-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前で絞り込み" />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>名前</th>
            <th className="num">担当パート数</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td>
                <Link to={`/people/${p.id}`}>{p.name}</Link>
              </td>
              <td className="num">{p.part_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {people.length === 0 && <p className="muted">該当する担当者がいません。</p>}
    </div>
  );
}
