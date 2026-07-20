import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Base, Heading, Input, Table, Td, Th } from "smarthr-ui";
import { api, Person } from "../api";

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<Person[]>(`/people?q=${encodeURIComponent(q)}`).then(setPeople).catch(console.error);
  }, [q]);

  return (
    <div>
      <Heading type="screenTitle" tag="h1" className="page-title">
        担当者一覧
      </Heading>
      <div className="filter-row">
        <Input name="filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前で絞り込み" width="20em" />
      </div>
      <Base padding={1} className="table-base">
        <div className="table-wrap">
          <Table>
            <thead>
              <tr>
                <Th>名前</Th>
                <Th>担当パート数</Th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <Link to={`/people/${p.id}`}>{p.name}</Link>
                  </Td>
                  <Td className="num">{p.part_count}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {people.length === 0 && <p className="muted">該当する担当者がいません。</p>}
      </Base>
    </div>
  );
}
