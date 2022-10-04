## Install

Clone the repo and install dependencies:

    git clone git@github.com:prometheon/bedrock-electron-2.git
    cd bedrock-electron-2
    yarn install

## Development

Start the app in the `development` environment:

    yarn start

## Packaging for Production

To package apps for the local platform:

    yarn package

To enable "Inspect element" context menu, run

    DEBUG_PROD=true yarn package

Then, after build is done, go to `release/build` directory and install suitable app-file
