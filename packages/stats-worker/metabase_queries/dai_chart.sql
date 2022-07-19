select
  (total_balances - total_deposits - native_token_debt) as "result",
  day
from (
    select
    (
        (restaked_amount + polygon_canonical_amount + polygon_hToken_amount + gnosis_canonical_amount + gnosis_hToken_amount + arbitrum_canonical_amount + arbitrum_hToken_amount + optimism_canonical_amount + optimism_hToken_amount + ethereum_canonical_amount + (staked_amount - unstaked_amount)) - initial_canonical_amount
    ) as "total_balances",
    (
        deposit_amount
    ) as "total_deposits",
    (
        (10.58487 * eth_price_usd) -
        (
          (polygon_native_amount * matic_price_usd) +
          (gnosis_native_amount * 1) +
          ((ethereum_native_amount + optimism_native_amount + arbitrum_native_amount + arbitrum_alias_amount) * eth_price_usd)
        )
    ) as "native_token_debt",
    (ethereum_native_amount + optimism_native_amount + arbitrum_native_amount + arbitrum_alias_amount) as "total_eth_amount",
    initial_canonical_amount,
    polygon_canonical_amount,
    polygon_hToken_amount,
    gnosis_canonical_amount,
    gnosis_hToken_amount,
    arbitrum_canonical_amount,
    arbitrum_hToken_amount,
    optimism_canonical_amount,
    optimism_hToken_amount,
    ethereum_canonical_amount,
    polygon_native_amount,
    matic_price_usd,
    gnosis_native_amount,
    ethereum_native_amount,
    optimism_native_amount,
    arbitrum_native_amount,
    arbitrum_alias_amount,
    eth_price_usd,
    staked_amount,
    unstaked_amount,
    (staked_amount - unstaked_amount) as current_staked_amount,
    strftime('%m - %d  - %Y', datetime(timestamp, 'unixepoch', 'utc')) as "day"
    from
        bonder_balances
    where
        token = 'DAI'
        and strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'utc')) >= '2021-11-12'
        and strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'utc')) < '2022-12-30'
    order by timestamp asc
)