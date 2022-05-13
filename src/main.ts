import path from "path";
import fs from "fs";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import YAML from "yaml";

const getParser = (file: string, options: { spacing: number }) => {
  const extension = path.extname(file).replace(".", "");

  switch (extension) {
    case "json":
      return {
        read: JSON.parse,
        write: (data: any) => JSON.stringify(data, null, options.spacing),
      };
    case "yaml":
    case "yml":
      return {
        read: YAML.parse,
        write: (data: any) => YAML.stringify(data, { indent: options.spacing }),
      };
    default:
      throw new Error(
        `Unsupported file extension "${extension}".\nTo add it you can simply submit a PR adding a new parser.`
      );
  }
};

const run = async () => {
  core.info("Setting input and environment variables");
  const root = process.env.GITHUB_WORKSPACE as string;
  const regex = new RegExp(core.getInput("version-regexp"));
  const files = core.getInput("files").replace(" ", "").split(",");

  // Forgive me for the unnecessary fanciness 🙏
  core.info("Updating files version field");
  const changed = files.reduce((change, file) => {
    const dir = path.join(root, file);
    const buffer = fs.readFileSync(dir, "utf-8");
    const parser = getParser(file, { spacing: 4 });
    const content = parser.read(buffer);

    const split = content.version.split(".");
    const newVersion = `${split[0]}.${split[1]}.${parseInt(split[2]) + 1}`;

    core.info(
      `  - ${file}: Update version from "${content.version}" to "${parseInt(split[2]) + 1}"`
    );
    fs.writeFileSync(dir, parser.write(content));
    return true;
  }, false);

  if (!changed) {
    core.info("Skipped commit since no files were changed");
    return;
  }
};

run()
  .then(() => core.info("Updated files version successfully"))
  .catch((error) => core.setFailed(error.message));
