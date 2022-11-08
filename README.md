## Install

Clone the repo and install dependencies:

    git clone git@github.com:prometheon/bedrock-electron-2.git
    cd bedrock-electron-2
    yarn install

## Development

Start the app in the `development` environment:

    yarn start

## Create a new icon from PNG template

Prepare big PNG-icon, at least 1024x1024, make sure there is approx 5% of transparent offset from the edges, so the icon will fit properly on Macs.
Then use https://www.npmjs.com/package/electron-icon-maker to compile new set of icons and place them to `./assets` dir in this repo.

## Packaging for Production

To package apps for the local platform:

    yarn package

Or for windows

    yarn package-win

After that, go to `./release/build` and find your package/app to run/setup

---

To enable debug only context menu items in prod-build, run this command instead:

- For Mac with Intel chip `yarn package-debug-mac`
- For Mac with M1 chip `yarn package-debug-mac-m1`
- For Windows `yarn package-debug-win`. Then run `./release/build/Bedrock Setup x.x.x.exe` to start the setup
