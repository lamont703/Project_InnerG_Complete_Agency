import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

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

    return new Promise((resolve) => {
      exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        console.log("RAW STDOUT FROM PYTHON:", stdout);
        if (error) {
          console.error(`Exec error: ${error}`);
          return resolve(NextResponse.json({ error: error.message, stderr }, { status: 500 }));
        }

        try {
          // Find the first '{' and last '}' to extract the JSON block
          // This prevents logs/warnings from breaking the parser
          const startIndex = stdout.indexOf("{");
          const endIndex = stdout.lastIndexOf("}");
          
          if (startIndex === -1 || endIndex === -1) {
            throw new Error("No JSON object found in output");
          }

          const jsonString = stdout.substring(startIndex, endIndex + 1);
          const result = JSON.parse(jsonString);
          resolve(NextResponse.json(result));
        } catch (parseError) {
          console.error(`Parse error: ${parseError}. Raw stdout: ${stdout}`);
          resolve(NextResponse.json({ error: "Failed to parse AI response", raw: stdout }, { status: 500 }));
        }
      });
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
