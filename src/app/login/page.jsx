import { auth } from "@/auth";
import SignIn from "@/components/SignIn";      // ✅ 改：默认导入
import { redirect } from "next/navigation";

export const runtime = "edge";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.role === "admin") {
    return redirect("/admin");
  } else if (session?.user?.role === "user") {
    return redirect("/");
  } else {
    // ✅ 改：直接渲染 SignIn（可按需指定登录成功后的跳转）
    return <SignIn afterPath="/" />;
  }
}
