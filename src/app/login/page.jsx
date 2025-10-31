import { auth } from "@/auth";
import SignIn from "@/components/SignIn";
import { redirect } from "next/navigation";

export const runtime = "edge";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.role === "admin") return redirect("/admin");
  if (session?.user?.role === "user")  return redirect("/");

  // 未登录：用一个全屏容器把表单垂直+水平居中
  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4">
      {/* 可选：柔光背景（不影响交互） */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-24 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* 登录成功后回首页；想进后台就改成 afterPath="/admin" */}
        <SignIn afterPath="/" />
      </div>
    </main>
  );
}
