import { NextRequest, NextResponse } from "next/server";
import { scaffoldProject } from "@/lib/scaffold";
import { getGithubToken } from "@/lib/keys";
import type { WritingType, ScrivaFeatures, WritingRules } from "@/types/scriva";

export async function POST(request: NextRequest) {
  try {
    var body = await request.json();
    var token = await getGithubToken(request);

    if (!token) {
      return NextResponse.json({ error: "Missing GitHub token" }, { status: 401 });
    }

    var owner = body.owner as string;
    var repo = body.repo as string;
    var branch = (body.branch as string) || "main";
    var writingType = (body.writingType as WritingType) || "fiction";
    var features = body.features as ScrivaFeatures | undefined;
    var rules = body.rules as WritingRules | undefined;

    var config = await scaffoldProject({
      token,
      owner,
      repo,
      branch,
      writingType,
      config: features ? { features } : undefined,
      rules,
    });

    return NextResponse.json({ success: true, config });
  } catch (err: unknown) {
    var message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
