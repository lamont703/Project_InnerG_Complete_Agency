import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), "scripts", "test_barber_agent.py");
    const venvPath = path.join(process.cwd(), "venv", "bin", "activate");

    // Command to run the python script within the venv
    const command = `source ${venvPath} && python3 ${scriptPath} --query "${query.replace(/"/g, '\\"')}"`;

    const { stdout, stderr } = await execPromise(command, { timeout: 60000 });
    
    console.log("RAW STDOUT FROM PYTHON:", stdout);

    try {
      // Find the first '{' and last '}' to extract the JSON block
      const startIndex = stdout.indexOf("{");
      const endIndex = stdout.lastIndexOf("}");
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("No JSON object found in output");
      }

      const jsonString = stdout.substring(startIndex, endIndex + 1);
      const result = JSON.parse(jsonString);
      return NextResponse.json(result);
    } catch (parseError) {
      console.error(`Parse error: ${parseError}. Raw stdout: ${stdout}`);
      return NextResponse.json({ error: "Failed to parse AI response", raw: stdout }, { status: 500 });
    }

  } catch (err: any) {
    console.error("API Bridge Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
