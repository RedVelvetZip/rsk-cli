import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import chalk from "chalk";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const walletFilePath = path.join(process.cwd(), "rootstock-wallets.json");

type InquirerAnswers = {
  action?: string;
  password?: string;
  privateKey?: string;
  address?: string;
  selectedWalletIndex?: number;
};

type Wallet = {
  address: string;
  encryptedPrivateKey: string;
  iv: string;
};

export async function walletCommand() {
  try {
    let wallets: Wallet[] = [];

    // Check if the wallet file already exists
    if (fs.existsSync(walletFilePath)) {
      const fileContent = fs.readFileSync(walletFilePath, "utf8");

      // Parse the content if not empty and ensure it's a valid array
      if (fileContent.trim().length > 0) {
        wallets = JSON.parse(fileContent);

        if (!Array.isArray(wallets)) {
          throw new Error("Malformed wallet file. Expected an array.");
        }
      }
    }

    // If wallets are found, prompt the user to select one
    if (wallets.length > 0) {
      const walletChoices = wallets.map((wallet, index) => ({
        name: wallet.address,
        value: index,
      }));

      const walletSelectionQuestion: any = [
        {
          type: "list",
          name: "selectedWalletIndex",
          message: "🔍 Multiple wallets found. Please select a wallet:",
          choices: walletChoices,
        },
      ];

      const { selectedWalletIndex } = await inquirer.prompt<InquirerAnswers>(
        walletSelectionQuestion
      );
      const selectedWallet = wallets[selectedWalletIndex];

      console.log(chalk.green("🎉 Using the selected wallet."));
      console.log(
        chalk.white(`📄 Address:`),
        chalk.green(`${chalk.bold(selectedWallet.address)}`)
      );
      return;
    }

    // Ask user to create a new wallet or insert an existing private key
    const questions: any = [
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: ["🆕 Create a new wallet", "🔑 Insert your private key"],
      },
    ];

    const { action } = await inquirer.prompt<InquirerAnswers>(questions);

    if (action === "🆕 Create a new wallet") {
      const privateKey: string = generatePrivateKey();
      const prefixedPrivateKey: `0x${string}` = `0x${privateKey.replace(
        /^0x/,
        ""
      )}` as `0x${string}`;
      const account = privateKeyToAccount(prefixedPrivateKey);

      console.log(
        chalk.rgb(255, 165, 0)(`🎉 Wallet created successfully on Rootstock!`)
      );
      console.log(
        chalk.white(`📄 Address:`),
        chalk.green(`${chalk.bold(account.address)}`)
      );
      console.log(
        chalk.white(`🔑 Private Key:`),
        chalk.green(`${chalk.bold(prefixedPrivateKey)}`)
      );
      console.log(
        chalk.gray("🔒 Please save the private key in a secure location.")
      );

      const passwordQuestion: any = [
        {
          type: "password",
          name: "password",
          message: "🔒 Enter a password to encrypt your wallet:",
          mask: "*",
        },
      ];

      const { password } = await inquirer.prompt<InquirerAnswers>(
        passwordQuestion
      );

      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(password!, Uint8Array.from(iv), 32);
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Uint8Array.from(key),
        Uint8Array.from(iv)
      );

      let encryptedPrivateKey = cipher.update(
        prefixedPrivateKey,
        "utf8",
        "hex"
      );
      encryptedPrivateKey += cipher.final("hex");

      const walletData: Wallet = {
        address: account.address,
        encryptedPrivateKey: encryptedPrivateKey,
        iv: iv.toString("hex"),
      };

      // Add new wallet to the array
      wallets.push(walletData);

      // Write the array to the file
      fs.writeFileSync(
        walletFilePath,
        JSON.stringify(wallets, null, 2),
        "utf8"
      );
      console.log(chalk.green(`💾 Wallet saved securely at ${walletFilePath}`));
      return;
    }

    if (action === "🔑 Insert your private key") {
      const inputQuestions: any = [
        {
          type: "password",
          name: "privateKey",
          message: "🔑 Enter your private key:",
          mask: "*",
        },
      ];

      const { privateKey } = await inquirer.prompt<InquirerAnswers>(
        inputQuestions
      );

      const prefixedPrivateKey = `0x${privateKey!.replace(
        /^0x/,
        ""
      )}` as `0x${string}`;
      const account = privateKeyToAccount(prefixedPrivateKey);

      console.log(chalk.green("✅ Wallet validated successfully!"));
      console.log(
        chalk.white(`📄 Address:`),
        chalk.green(`${chalk.bold(account.address)}`)
      );

      const passwordQuestion: any = [
        {
          type: "password",
          name: "password",
          message: "🔒 Enter a password to encrypt your wallet:",
          mask: "*",
        },
      ];

      const { password } = await inquirer.prompt<InquirerAnswers>(
        passwordQuestion
      );

      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(password!, Uint8Array.from(iv), 32);
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Uint8Array.from(key),
        Uint8Array.from(iv)
      );

      let encryptedPrivateKey = cipher.update(
        prefixedPrivateKey,
        "utf8",
        "hex"
      );
      encryptedPrivateKey += cipher.final("hex");

      const walletData: Wallet = {
        address: account.address,
        encryptedPrivateKey: encryptedPrivateKey,
        iv: iv.toString("hex"),
      };

      // Add new wallet to the array
      wallets.push(walletData);

      // Write the updated array to the file
      fs.writeFileSync(
        walletFilePath,
        JSON.stringify(wallets, null, 2),
        "utf8"
      );
      console.log(chalk.green(`💾 Wallet saved securely at ${walletFilePath}`));
    }
  } catch (error: any) {
    console.error(
      chalk.red("❌ Error creating or managing wallet:"),
      chalk.yellow(error.message || error)
    );
  }
}
