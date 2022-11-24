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

### Prepare certificates for signing

To package production-ready app you will need to install certificates first, so it could be signed properly

Add certificates to your OS's Keychain, should be done only once per certificate:

- Go to `MacOS-certificates` dir in this repo and run each of them to add them.
- In popup under "Keychain:" dropdown choose "System"
- Test if valid certificate for signing is present by running `security find-identity -vp codesigning`, it should show `1 valid identities found`:
  ```
  $ security find-identity -vp codesigning
  1) 3EC8422AF3E49C71D4D9424388B9FAA39BC0FF6C "Developer ID Application: Prometheon Systems, Inc. (5KL32K872M)"
     1 valid identities found
  ```
- If previous step went as expected, you can proceed with "Compile apps" step below
- If you shill see `0 valid identities found`, it is possible that you need to generate certificates once again.
  Follow [those instructions](./doc/Generate-MacOS-Certificates.md) to do that. After you have fresh certs, put them in `MacOS-certificates` dir and repeat current steps

### Compile apps

#### Package apps for MacOS

Run:

    yarn package

During the build you should see info about certificate used for signing:

```
• signing file=release/build/mac/Bedrock.app identityName=Developer ID Application: Prometheon Systems, Inc. (5KL32K872M)
  identityHash=3EC8422AF3E49C71D4D9424388B9FAA39BC0FF6C provisioningProfile=none
```

After that, go to `./release/build` and find your dmg-files:

- `Bedrock-x.x.x.dmg` - for MacOS on Intel chip
- `Bedrock-x.x.x-arm64.dmg` - for MacOS on M1 chip

#### Package app for Windows

Run:

    yarn package-win

After that, go to `./release/build` and find your setup file:

- `Bedrock Setup x.x.x.exe` - for Windows

---

To enable debug only context menu items in prod-build, run this command instead:

- For Mac with Intel chip `yarn package-debug-mac`
- For Mac with M1 chip `yarn package-debug-mac-m1`
- For Windows `yarn package-debug-win`. Then use `./release/build/Bedrock Setup x.x.x.exe` to start the setup
