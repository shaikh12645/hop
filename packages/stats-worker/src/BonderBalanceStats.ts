import path from 'path'
import BlockDater from 'ethereum-block-by-date'
import { BigNumber, providers, Contract, constants } from 'ethers'
import {
  formatUnits,
  parseEther,
  formatEther,
  parseUnits
} from 'ethers/lib/utils'
import { DateTime } from 'luxon'
import Db from './Db'
import {
  ethereumRpc,
  gnosisRpc,
  polygonRpc,
  optimismRpc,
  arbitrumRpc
} from './config'
import { mainnet as mainnetAddresses } from '@hop-protocol/core/addresses'
import { erc20Abi } from '@hop-protocol/core/abi'
import { createObjectCsvWriter } from 'csv-writer'
import { chunk } from 'lodash'

// DATA /////////////////////////////////////////////
const arbitrumAliases: Record<string, string> = {
  USDC: '0xbdacabf20ef2338d7f4a152af43beddc80c6bf3b',
  USDT: '0x81B872dDc3413E3456E5A3b2c30cB749c9578e30',
  DAI: '0x36b6a48c35e75bd2eff53d94f0bb60d5a00e47fb',
  ETH: '0xfe0368be00308980b5b3fcd0975d47c4c8e1493b',
  WBTC: '0x22902f67cd7570e0e8fd30264f96ca39eebc2b6f'
}

const totalBalances: Record<string, BigNumber> = {
  USDC: parseUnits('6026000', 6),
  USDT: parseUnits('2121836', 6),
  DAI: parseUnits('5000000', 18),
  ETH: parseUnits('3984', 18),
  MATIC: parseUnits('731948.94', 18)
}

const initialAggregateBalances: Record<string, BigNumber> = {
  USDC: parseUnits('0', 6),
  USDT: parseUnits('0', 6),
  DAI: parseUnits('0', 18),
  ETH: parseUnits('0', 18),
  MATIC: parseUnits('0', 18),
  WBTC: parseUnits('0', 8)
}

const initialAggregateNativeBalances: any = {
  USDC: {
    // ethereum: parseUnits('14', 18)
  },
  USDT: {},
  DAI: {},
  ETH: {},
  MATIC: {},
  WBTC: {}
}

const unstakedAmounts: Record<string, any> = {
  // 0xa6a688F107851131F0E1dce493EbBebFAf99203e
  USDC: {
    [1625036400]: parseUnits('9955.84', 6) // 06/30/2021
  },
  // 0x15ec4512516d980090050fe101de21832c8edfee
  USDT: {
    [1642492800]: parseUnits('58043.34', 6), // 01/18/2022 (22.7886 ETH)
    [1643011200]: parseUnits('7228.11', 6), // 01/24/2022
    [1643011201]: parseUnits('610.57', 6), // 01/24/2022 (0.25 ETH)
    [1643356800]: parseUnits('0.87', 6) // 01/28/2022
  },
  // 0x305933e09871D4043b5036e09af794FACB3f6170
  DAI: {
    [1636617600]: parseUnits('8752.88', 18), // 11/11/2021
    [1636617601]: parseUnits('23422.52', 18), // 11/11/2021
    [1643961600]: parseUnits('300000', 18) // 02/4/2022
  },
  // 0x710bDa329b2a6224E4B44833DE30F38E7f81d564
  ETH: {
    [1639555200]: parseEther('6.07'), // 12/15/2021
    [1639641600]: parseEther('26') // 12/16/2021
  },
  // 0xd8781ca9163e9f132a4d8392332e64115688013a
  MATIC: {},
  // 0x2A6303e6b99d451Df3566068EBb110708335658f
  WBTC: {}
}

const restakedProfits: Record<string, any> = {
  // 0xa6a688F107851131F0E1dce493EbBebFAf99203e
  USDC: {
    [1627628400]: parseUnits('9000', 6), // 7/30/2021
    [1637395200]: parseUnits('1340.36', 6), // 11/20/2021
    [1643443200]: parseUnits('2998.70', 6) // 01/29/2022
  },
  // 0x15ec4512516d980090050fe101de21832c8edfee
  USDT: {
    [1643011200]: parseUnits('244.23', 6) // 01/24/2021 // idle (0.1 ETH)
  },
  // 0x305933e09871D4043b5036e09af794FACB3f6170
  DAI: {
    [1644220800]: parseUnits('300000', 18), // 02/7/2022 // idle
    [1644480000]: parseUnits('8752.88', 18), // 02/11/2022
    [1644480001]: parseUnits('23422.52', 18) // 02/11/2022
  },
  // 0x710bDa329b2a6224E4B44833DE30F38E7f81d564
  ETH: {
    [1640678400]: parseEther('6.07'), // 12/28/2021
    [1643184000]: parseEther('10') // 01/26/2022
  },
  // 0xd8781ca9163e9f132a4d8392332e64115688013a
  MATIC: {},
  // 0x2A6303e6b99d451Df3566068EBb110708335658f
  WBTC: {}
}

/////////////////////////////////////////////////////

type Options = {
  days?: number
  skipDays?: number
  tokens?: string[]
}

class BonderBalanceStats {
  db = new Db()
  days: number = 1
  skipDays: number = 0
  tokens?: string[] = ['USDC', 'USDT', 'DAI', 'ETH', 'MATIC', 'WBTC']
  chains = ['ethereum', 'polygon', 'gnosis', 'optimism', 'arbitrum']

  allProviders: Record<string, any> = {
    ethereum: new providers.StaticJsonRpcProvider(ethereumRpc),
    gnosis: new providers.StaticJsonRpcProvider(gnosisRpc),
    polygon: new providers.StaticJsonRpcProvider(polygonRpc),
    optimism: new providers.StaticJsonRpcProvider(optimismRpc),
    arbitrum: new providers.StaticJsonRpcProvider(arbitrumRpc)
  }

  tokenDecimals: Record<string, number> = {
    USDC: 6,
    USDT: 6,
    DAI: 18,
    MATIC: 18,
    ETH: 18,
    WBTC: 8
  }

  constructor (options: Options = {}) {
    if (options.days) {
      this.days = options.days
    }
    if (options.skipDays) {
      this.skipDays = options.skipDays
    }
    if (options.tokens) {
      this.tokens = options.tokens
    }

    process.once('uncaughtException', async err => {
      console.error('uncaughtException:', err)
      this.cleanUp()
      process.exit(0)
    })

    process.once('SIGINT', () => {
      this.cleanUp()
    })
  }

  cleanUp () {
    // console.log('closing db')
    // this.db.close()
  }

  async run () {
    while (true) {
      try {
        await this.track()
        break
      } catch (err) {
        console.error(err)
      }
    }
  }

  async getTokenPrices () {
    const priceDays = 365
    const pricesArr = await Promise.all([
      this.getPriceHistory('usd-coin', priceDays),
      this.getPriceHistory('tether', priceDays),
      this.getPriceHistory('dai', priceDays),
      this.getPriceHistory('ethereum', priceDays),
      this.getPriceHistory('matic-network', priceDays),
      this.getPriceHistory('wrapped-bitcoin', priceDays)
    ])
    const prices: Record<string, any> = {
      USDC: pricesArr[0],
      USDT: pricesArr[1],
      DAI: pricesArr[2],
      ETH: pricesArr[3],
      MATIC: pricesArr[4],
      WBTC: pricesArr[5]
    }

    return prices
  }

  async trackDay (day: number, token: string, prices: any) {
    console.log('day:', day)
    const now = DateTime.utc()
    const date = now.minus({ days: day }).startOf('day')
    const timestamp = Math.floor(date.toSeconds())
    const isoDate = date.toISO()
    console.log('date:', isoDate)

    const priceMap: any = {}
    for (const _token in prices) {
      const dates = prices[_token].reverse().map((x: any) => x[0])
      const nearest = this.nearestDate(dates, timestamp)
      const price = prices[_token][nearest][1]
      priceMap[_token] = price
    }

    const { bonderBalances, dbData } = await this.fetchBonderBalances(
      token,
      timestamp,
      priceMap
    )

    const initialAggregateBalance = initialAggregateBalances?.[token]
    const initialAggregateNativeBalance =
      initialAggregateNativeBalances?.[token]

    let unstakedAmount = BigNumber.from(0)
    for (const ts in unstakedAmounts[token]) {
      if (Number(ts) <= timestamp) {
        unstakedAmount = unstakedAmount.add(unstakedAmounts[token][ts])
        console.log(
          ts,
          'subtract unstaked amount',
          unstakedAmounts[token][ts].toString()
        )
      }
    }

    let restakedAmount = BigNumber.from(0)
    for (const ts in restakedProfits[token]) {
      if (Number(ts) <= timestamp) {
        restakedAmount = restakedAmount.add(restakedProfits[token][ts])
        console.log(
          ts,
          'add restaked amount',
          restakedProfits[token][ts].toString()
        )
      }
    }

    const { resultFormatted } = await this.computeResult({
      token,
      initialAggregateBalance,
      initialAggregateNativeBalance,
      restakedAmount,
      unstakedAmount,
      bonderBalances,
      priceMap
    })

    dbData.unstakedAmount = formatUnits(
      unstakedAmount,
      this.tokenDecimals[token]
    )

    dbData.restakedAmount = formatUnits(
      restakedAmount,
      this.tokenDecimals[token]
    )

    console.log('results', token, timestamp, resultFormatted)

    try {
      await this.db.upsertBonderBalances(
        token,
        dbData.polygonBlockNumber,
        dbData.polygonCanonicalAmount,
        dbData.polygonHTokenAmount,
        dbData.polygonNativeAmount,
        dbData.gnosisBlockNumber,
        dbData.gnosisCanonicalAmount,
        dbData.gnosisHTokenAmount,
        dbData.gnosisNativeAmount,
        dbData.arbitrumBlockNumber,
        dbData.arbitrumCanonicalAmount,
        dbData.arbitrumHTokenAmount,
        dbData.arbitrumNativeAmount,
        dbData.arbitrumAliasAmount,
        dbData.optimismBlockNumber,
        dbData.optimismCanonicalAmount,
        dbData.optimismHTokenAmount,
        dbData.optimismNativeAmount,
        dbData.ethereumBlockNumber,
        dbData.ethereumCanonicalAmount,
        dbData.ethereumNativeAmount,
        dbData.unstakedAmount,
        dbData.restakedAmount,
        dbData.ethPriceUsd,
        dbData.maticPriceUsd,
        resultFormatted,
        timestamp
      )
      console.log('upserted')
    } catch (err) {
      if (!err.message.includes('UNIQUE constraint failed')) {
        throw err
      }
    }

    return dbData
  }

  async track () {
    console.log('days:', this.days)
    console.log('chains:', this.chains)
    console.log('tokens:', this.tokens)

    const prices = await this.getTokenPrices()

    for (const token of this.tokens) {
      const days = Array(this.days)
        .fill(0)
        .map((n, i) => n + i)
      const chunkSize = 10
      const allChunks = chunk(days, chunkSize)
      const csv: any[] = []
      for (const chunks of allChunks) {
        csv.push(
          ...(await Promise.all(
            chunks.map(async (day: number) => {
              return this.trackDay(day, token, prices)
            })
          ))
        )
      }

      const data = Object.values(csv)
      const headers = Object.keys(data[0])
      const rows = Object.values(data)
      const csvPath = path.resolve(__dirname, '../', `${token}.csv`)
      const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: headers.map(id => {
          return { id, title: id }
        })
      })

      await csvWriter.writeRecords(rows)
      console.log(`wrote ${csvPath}`)
    }
  }

  async fetchBonderBalances (token: string, timestamp: number, priceMap: any) {
    const bonders = (mainnetAddresses as any).bonders
    const bonderMap = bonders[token]
    const bonderBalances: any = {}
    const dbData: any = {}
    const chainPromises: any[] = []

    for (const sourceChain in bonderMap) {
      for (const destinationChain in bonderMap[sourceChain]) {
        chainPromises.push(
          new Promise(async resolve => {
            const chain = destinationChain
            const provider = this.allProviders[chain]
            const bonder = bonderMap[sourceChain][destinationChain]
            if (bonderBalances[chain]) {
              resolve(null)
              return
            }
            if (!bonderBalances[chain]) {
              bonderBalances[chain] = {
                canonical: BigNumber.from(0),
                hToken: BigNumber.from(0),
                native: BigNumber.from(0),
                alias: BigNumber.from(0)
              }
            }
            const bridgeMap = (mainnetAddresses as any).bridges[token][chain]
            const tokenAddress =
              bridgeMap.l2CanonicalToken ?? bridgeMap.l1CanonicalToken
            const hTokenAddress = bridgeMap.l2HopBridgeToken
            const tokenContract = new Contract(tokenAddress, erc20Abi, provider)
            const hTokenContract = hTokenAddress
              ? new Contract(hTokenAddress, erc20Abi, provider)
              : null

            console.log(
              `fetching daily bonder balance stat, chain: ${chain}, token: ${token}, timestamp: ${timestamp}`
            )

            const blockDater = new BlockDater(provider)
            const date = DateTime.fromSeconds(timestamp).toJSDate()
            const info = await blockDater.getDate(date)
            if (!info) {
              throw new Error('no info')
            }
            const blockTag = info.block
            const balancePromises: Promise<any>[] = []

            if (tokenAddress !== constants.AddressZero) {
              balancePromises.push(
                tokenContract.balanceOf(bonder, {
                  blockTag
                })
              )
            } else {
              balancePromises.push(Promise.resolve(0))
            }

            if (hTokenContract) {
              balancePromises.push(
                hTokenContract.balanceOf(bonder, {
                  blockTag
                })
              )
            } else {
              balancePromises.push(Promise.resolve(0))
            }

            balancePromises.push(provider.getBalance(bonder, blockTag))

            if (chain === 'arbitrum') {
              balancePromises.push(
                provider.getBalance(arbitrumAliases[token], blockTag)
              )
            } else {
              balancePromises.push(Promise.resolve(0))
            }

            const [balance, hBalance, native, aliasBalance] = await Promise.all(
              balancePromises
            )

            bonderBalances[chain].canonical = balance
            bonderBalances[chain].hToken = hBalance
            bonderBalances[chain].native = native
            bonderBalances[chain].alias = aliasBalance

            dbData[`${chain}BlockNumber`] = blockTag
            dbData[`${chain}CanonicalAmount`] = balance
              ? formatUnits(balance.toString(), this.tokenDecimals[token])
              : 0
            dbData[`${chain}NativeAmount`] = native
              ? formatEther(native.toString())
              : 0
            dbData.ethPriceUsd = priceMap['ETH']
            dbData.maticPriceUsd = priceMap['MATIC']
            if (chain !== 'ethereum') {
              dbData[`${chain}HTokenAmount`] = hBalance
                ? formatUnits(hBalance.toString(), this.tokenDecimals[token])
                : 0
            }
            if (chain === 'arbitrum') {
              dbData[`${chain}AliasAmount`] = aliasBalance
                ? formatEther(aliasBalance.toString())
                : 0
            }

            console.log(`done fetching daily bonder fee stat, chain: ${chain}`)

            resolve(null)
          })
        )
      }
    }

    await Promise.all(chainPromises)

    console.log('done fetching timestamp balances')
    return { bonderBalances, dbData }
  }

  async computeResult (data: any = {}) {
    const {
      token,
      initialAggregateBalance,
      initialAggregateNativeBalance,
      restakedAmount,
      unstakedAmount,
      bonderBalances,
      priceMap
    } = data
    let aggregateBalance = initialAggregateBalance
      .sub(unstakedAmount)
      .add(restakedAmount)
    const nativeBalances: Record<string, any> = {}
    for (const chain of this.chains) {
      nativeBalances[chain] = BigNumber.from(0)
    }

    for (const chain in bonderBalances) {
      const { canonical, hToken, native, alias } = bonderBalances[chain]
      aggregateBalance = aggregateBalance.add(canonical).add(hToken)
      nativeBalances[chain] = native.add(alias)
    }
    const nativeTokenDiffs: Record<string, any> = {}
    for (const chain of this.chains) {
      nativeTokenDiffs[chain] = nativeBalances[chain].sub(
        initialAggregateNativeBalance?.[chain] ?? 0
      )
    }
    const nativeTokenDiffsInToken: Record<string, any> = {}
    for (const chain of this.chains) {
      const multiplier = parseEther('1')
      const nativeSymbol = this.getChainNativeTokenSymbol(chain)
      const nativeTokenPriceUsdWei = parseEther(
        priceMap[nativeSymbol].toString()
      )
      const tokenPriceUsdWei = parseEther(priceMap[token].toString())
      const nativeTokenDecimals = this.tokenDecimals[nativeSymbol]
      const rate = nativeTokenPriceUsdWei.mul(multiplier).div(tokenPriceUsdWei)
      const exponent = nativeTokenDecimals - this.tokenDecimals[token]

      const diff = nativeTokenDiffs[chain]
      const resultInTokenWei = diff.mul(rate).div(multiplier)
      const resultInToken = resultInTokenWei.div(
        BigNumber.from(10).pow(exponent)
      )
      nativeTokenDiffsInToken[chain] = resultInToken.sub(
        initialAggregateNativeBalance?.[chain] ?? 0
      )
    }
    let nativeTokenDiffSum = BigNumber.from(0)
    for (const chain of this.chains) {
      nativeTokenDiffSum = nativeTokenDiffSum.add(
        nativeTokenDiffsInToken[chain]
      )
    }
    let result = aggregateBalance.add(nativeTokenDiffSum)
    if (result.lt(0)) {
      result = BigNumber.from(0)
    }
    const resultFormatted = Number(
      formatUnits(result.toString(), this.tokenDecimals[token])
    )

    return {
      result,
      resultFormatted
    }
  }

  async getPriceHistory (coinId: string, days: number) {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
    return fetch(url)
      .then(res => res.json())
      .then(json => {
        if (!json.prices) {
          console.log(json)
        }
        return json.prices.map((data: any[]) => {
          data[0] = Math.floor(data[0] / 1000)
          return data
        })
      })
  }

  getChainNativeTokenSymbol (chain: string) {
    if (chain === 'polygon') {
      return 'MATIC'
    } else if (chain === 'gnosis') {
      return 'DAI'
    }

    return 'ETH'
  }

  nearestDate (dates: any[], target: any) {
    if (!target) {
      target = Date.now()
    } else if (target instanceof Date) {
      target = target.getTime()
    }

    var nearest = Infinity
    var winner = -1

    dates.forEach(function (date, index) {
      if (date instanceof Date) date = date.getTime()
      var distance = Math.abs(date - target)
      if (distance < nearest) {
        nearest = distance
        winner = index
      }
    })

    return winner
  }
}

export default BonderBalanceStats