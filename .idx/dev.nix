# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Using stable-23.11 channel as specified.
  channel = "stable-23.11";

  # Environment packages.
  # Added pkgs.chromium for Puppeteer PDF generation.
  # Removed pkgs.python3 as it's not in the specified tech stack.
  packages = [
    pkgs.nodejs_18
    pkgs.nodePackages.npm
    pkgs.nodePackages.node-gyp
    # For Puppeteer, which is used for PDF generation
    pkgs.chromium
    # Dependencies for canvas-based PDF generation, keeping them just in case.
    pkgs.cairo
    pkgs.pango
    pkgs.libjpeg
    pkgs.giflib
    pkgs.librsvg
  ];

  # Sets environment variables in the workspace.
  # You'll need to create a .env file for your secrets.
  env = {};

  idx = {
    # Recommended extensions for a Node.js project.
    extensions = [
      "dbaeumer.vscode-eslint"
    ];

    # Workspace lifecycle hooks.
    workspace = {
      # Runs when a workspace is first created.
      # This will install your npm dependencies.
      onCreate = {
        npm-install = "npm install";
      };

      # Runs when the workspace is (re)started.
      # This will start your WhatsApp bot.
      onStart = {
        start-bot = "node index.js";
      };
    };
  };
}
