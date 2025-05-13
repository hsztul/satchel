"use client";
import Layout from "../Layout";
import EntryInputForm from "../EntryInputForm";
import EntryFeed from "../EntryFeed";

import React, { useState } from "react";

export default function Home() {
  const [feedKey, setFeedKey] = useState(0);
  return (
    <Layout>
      <EntryInputForm onSuccess={() => setFeedKey(k => k + 1)} />
      <EntryFeed key={feedKey} />
    </Layout>
  );
}
