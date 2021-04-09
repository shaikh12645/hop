export const addresses = {
  DAI: {
    ethereum: {
      l1CanonicalToken: '0x943599d17FE82Bb4563b1823500f3267f91Acd2e',
      l1Bridge: '0xdEd8A18c7E21aC4B9b0eb4B06701aF806262dc56'
    },
    optimism: {
      l1CanonicalBridge: '0xC1e7Be0E1aDD345afB2485aA5E774cD79cBbbBf5',
      l2CanonicalBridge: '0x782e1ec5F7381269b2e5DC4eD58648C60161539b',
      l2CanonicalToken: '0x943599d17FE82Bb4563b1823500f3267f91Acd2e',
      l2Bridge: '0x98F43B673107A3c2c716212A48D79DEA3bcb5C44',
      l2HopBridgeToken: '0x979BC1824fcE61c56927Fd0d487A0a9bBE664eD8',
      l2UniswapWrapper: '0xCe1E8dbEDBe7Bf9b6f59fc280a8256763BCc19B6',
      l2UniswapRouter: '0x41A4Cad9BF917199C0503055c2908FDbd4EA1A00',
      l2UniswapFactory: '0x9FB93025189ee5394ec94273F095cc907e4C7F9a',
      l2UniswapExchange: '0x26a7B7E78253096a66CDAC050dA489258C57d0F9'
    },
    xdai: {
      l1CanonicalBridge: '0xA960d095470f7509955d5402e36d9DB984B5C8E2',
      l2CanonicalBridge: '0x40CdfF886715A4012fAD0219D15C98bB149AeF0e',
      l2CanonicalToken: '0x1a844c99766d67E6031c337E28233Fe2BF773603',
      l2Bridge: '0x65fF1e20D5D121d24EbeE21ec9C5239390220998',
      l2HopBridgeToken: '0x943599d17FE82Bb4563b1823500f3267f91Acd2e',
      l2UniswapWrapper: '0xdEd8A18c7E21aC4B9b0eb4B06701aF806262dc56',
      l2UniswapRouter: '0x4C1A9579B7B971011498FFa69257E10D4b896469',
      l2UniswapFactory: '0xD0d726de6208E538E1e1a6B5C0eccDF6B87802D8',
      l2UniswapExchange: '0x53e4Dac58451722ec9cc28b61bEF767d34Dfdf07',
      l1Amb: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560',
      l2Amb: '0xFe446bEF1DbF7AFE24E81e05BC8B271C1BA9a560'
    }
  }
}

export const networks: any = {
  ethereum: {
    networkId: '42',
    rpcUrl: 'https://kovan.rpc.hop.exchange'
  },
  arbitrum: {
    networkId: '79377087078960',
    rpcUrl: 'https://kovan3.arbitrum.io/rpc',
    explorerUrl: 'https://explorer.offchainlabs.com/#/'
  },
  optimism: {
    networkId: '69',
    rpcUrl: 'https://kovan.optimism.io'
  },
  xdai: {
    networkId: '77',
    rpcUrl: 'https://sokol.poa.network'
  }
}
