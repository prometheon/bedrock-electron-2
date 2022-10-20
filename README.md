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

To enable "Inspect element" and "Refresh page" context menu, make prod-ready app to launch right after build, run this command instead

    yarn package-debug-mac
