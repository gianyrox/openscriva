import { NextRequest, NextResponse } from "next/server";
import { getGithubToken } from "@/lib/keys";
import { Octokit } from "@octokit/rest";

export async function GET(request: NextRequest) {
  try {
    const token = await getGithubToken(request);
    
    if (!token) {
      return NextResponse.json({
        authenticated: false,
        installed: false,
      });
    }

    try {
      const octokit = new Octokit({ auth: token });
      const { data: user } = await octokit.users.getAuthenticated();
      
      return NextResponse.json({
        authenticated: true,
        installed: true,
        username: user.login,
      });
    } catch {
      return NextResponse.json({
        authenticated: false,
        installed: false,
      });
    }
  } catch {
    return NextResponse.json({
      authenticated: false,
      installed: false,
    });
  }
}
