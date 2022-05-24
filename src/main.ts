import path from "path";
import fs from "fs";
import * as core from "@actions/core";
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
  const files = core.getInput("files").replace(" ", "").split(",");

  // Forgive me for the unnecessary fanciness 🙏
  core.info("Updating files version field");
  const changed = files.reduce((change, file) => {
    const dir = path.join(root, file);
    const buffer = fs.readFileSync(dir, "utf-8");
    const parser = getParser(file, { spacing: 2 });
    
    const content = parser.read(buffer);

    core.info(dir);
    core.info(content);

    const newVersion = `${parseInt(content.expo.ios.buildNumber, 10) + 1}`;

    core.info(
      `  - ${file}: Update version from "${content.expo.ios.buildNumber}" to "${newVersion}"`
    );

    content.expo.ios.buildNumber = newVersion;
    fs.writeFileSync(dir, parser.write(content));
    return true;
  }, false);

  if (!changed) {
    core.info("Skipped commit since no files were changed");
    
  }
};

run()
  .then(() => core.info("Updated files version successfully"))
  .catch((error) => core.setFailed(error.message));
