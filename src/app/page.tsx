"use client";

import { useRouter } from "@/lib/router";
import { Header } from "@/components/progtype/Header";
import { HomeView } from "@/components/progtype/HomeView";
import { ArticleView } from "@/components/progtype/ArticleView";
import { LoginView } from "@/components/progtype/LoginView";
import { AdminDashboard } from "@/components/progtype/AdminDashboard";
import { AdminAnalytics } from "@/components/progtype/AdminAnalytics";
import { EditorView } from "@/components/progtype/EditorView";
import { Footer } from "@/components/progtype/Footer";

export default function Home() {
  const { route, navigate } = useRouter();
  const [s1, s2, s3] = route.segments;

  let content: React.ReactNode = null;

  if (!s1) {
    content = <HomeView onNavigate={navigate} />;
  } else if (s1 === "article" && s2) {
    content = <ArticleView slug={s2} onNavigate={navigate} />;
  } else if (s1 === "login") {
    content = <LoginView onNavigate={navigate} />;
  } else if (s1 === "admin") {
    if (s2 === "new") {
      content = <EditorView onNavigate={navigate} />;
    } else if (s2 === "edit" && s3) {
      content = <EditorView slug={s3} onNavigate={navigate} />;
    } else if (s2 === "analytics") {
      content = <AdminAnalytics onNavigate={navigate} />;
    } else {
      content = <AdminDashboard onNavigate={navigate} />;
    }
  } else {
    // неизвестный путь → на главную
    content = <HomeView onNavigate={navigate} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onNavigate={navigate} currentPath={route.path} />
      <main className="flex-1">{content}</main>
      <Footer onNavigate={navigate} />
    </div>
  );
}
