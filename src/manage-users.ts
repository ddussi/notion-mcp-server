#!/usr/bin/env node

/**
 * User Management Utility
 *
 * Usage:
 *   npm run manage-users add <name>
 *   npm run manage-users list
 *   npm run manage-users remove <api-key>
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UserPermissions {
  allowedDatabases?: string[];
  allowedPages?: string[];
}

interface User {
  name: string;
  apiKey: string;
  permissions: UserPermissions;
  createdAt: string;
}

const USERS_FILE = path.join(__dirname, "..", "users.json");

function loadUsers(): User[] {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(data);
}

function saveUsers(users: User[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function generateApiKey(): string {
  return "mcp_" + crypto.randomBytes(32).toString("hex");
}

function addUser(name: string) {
  const users = loadUsers();
  const apiKey = generateApiKey();

  const newUser: User = {
    name,
    apiKey,
    permissions: {}, // Full access by default
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  console.log("\nUser created successfully!\n");
  console.log(`Name: ${name}`);
  console.log(`API Key: ${apiKey}`);
  console.log(`Permissions: Full access (no restrictions)`);
  console.log("\nSave this API key securely. It won't be shown again.\n");
}

function listUsers() {
  const users = loadUsers();

  if (users.length === 0) {
    console.log("\nNo users found.\n");
    return;
  }

  console.log("\nRegistered Users:\n");
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name}`);
    console.log(`   API Key: ${user.apiKey}`);
    console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);

    if (user.permissions.allowedDatabases && user.permissions.allowedDatabases.length > 0) {
      console.log(`   Allowed Databases: ${user.permissions.allowedDatabases.join(", ")}`);
    } else {
      console.log(`   Allowed Databases: All`);
    }

    if (user.permissions.allowedPages && user.permissions.allowedPages.length > 0) {
      console.log(`   Allowed Pages: ${user.permissions.allowedPages.join(", ")}`);
    } else {
      console.log(`   Allowed Pages: All`);
    }

    console.log();
  });
}

function removeUser(apiKey: string) {
  const users = loadUsers();
  const filteredUsers = users.filter((u) => u.apiKey !== apiKey);

  if (filteredUsers.length === users.length) {
    console.log("\nUser not found.\n");
    return;
  }

  saveUsers(filteredUsers);
  console.log("\nUser removed successfully.\n");
}

function setPermissions(apiKey: string, type: "database" | "page", ids: string[]) {
  const users = loadUsers();
  const user = users.find((u) => u.apiKey === apiKey);

  if (!user) {
    console.log("\nUser not found.\n");
    return;
  }

  if (type === "database") {
    user.permissions.allowedDatabases = ids;
  } else {
    user.permissions.allowedPages = ids;
  }

  saveUsers(users);
  console.log("\nPermissions updated successfully.\n");
}

// CLI
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv.slice(4);

switch (command) {
  case "add":
    if (!arg1) {
      console.log("Usage: npm run manage-users add <name>");
      process.exit(1);
    }
    addUser(arg1);
    break;

  case "list":
    listUsers();
    break;

  case "remove":
    if (!arg1) {
      console.log("Usage: npm run manage-users remove <api-key>");
      process.exit(1);
    }
    removeUser(arg1);
    break;

  case "set-db-permissions":
    if (!arg1 || arg2.length === 0) {
      console.log("Usage: npm run manage-users set-db-permissions <api-key> <db-id1> <db-id2> ...");
      process.exit(1);
    }
    setPermissions(arg1, "database", arg2);
    break;

  case "set-page-permissions":
    if (!arg1 || arg2.length === 0) {
      console.log("Usage: npm run manage-users set-page-permissions <api-key> <page-id1> <page-id2> ...");
      process.exit(1);
    }
    setPermissions(arg1, "page", arg2);
    break;

  default:
    console.log("\nUser Management Utility\n");
    console.log("Available commands:");
    console.log("  add <name>                                    - Add a new user");
    console.log("  list                                          - List all users");
    console.log("  remove <api-key>                              - Remove a user");
    console.log("  set-db-permissions <api-key> <db-id> ...      - Set database permissions");
    console.log("  set-page-permissions <api-key> <page-id> ...  - Set page permissions");
    console.log();
    break;
}
