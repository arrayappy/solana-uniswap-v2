<div align="center">
  <h1>Solana Uniswap V2 Program</h1>
  <a href="#overview">Overview</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="#repo-structure">Repo Structure</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="#prerequisites">Prerequisites</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="#development">Development</a>
  <br />
  <hr />
</div>

## Overview

This project implements a Uniswap V2-like Automated Market Maker (AMM) on Solana using the Anchor framework. It features:

- Creation of AMM configurations
- Pool creation for token pairs
- Liquidity provision and withdrawal
- Token swapping with constant product formula
- Fee mechanism for liquidity providers

The program uses the constant product formula (x * y = k) to determine swap amounts and maintain price equilibrium. Fees are collected on each swap and distributed to liquidity providers.

### Accounts
- **`Amm`**: This account stores the AMM configuration, including the fee percentage and admin authority.
- **`Pool`**: This account represents a liquidity pool for a pair of tokens. It stores references to the token mints and the AMM it belongs to.
- **`Mint`**: Standard SPL Token mint accounts are used for the pool tokens and the liquidity token.
- **`TokenAccount`**: Standard SPL Token accounts are used to hold token balances for the pool and users.

### Instructions
- `initialize_amm`: Creates a new `Amm` account with specified parameters.
- `initialize_pool`: Creates a new `Pool` account for a given token pair.
- `deposit_liquidity`: Allows users to provide liquidity to a pool.
- `withdraw_liquidity`: Allows users to withdraw their liquidity from a pool.
- `swap`: Performs a token swap with a specified input amount.


## Repo Structure

This repo contains the Solana program source code and client-side program tests written in TypeScript.
```.
├── keys                 # Program keypairs
├── programs             # Solana program source code
│   ├── src              # Program source folder
│   │   ├── instructions # Contains all the program instructions
│   │   ├── state        # Contains all the program accounts
│   │   ├── constants.rs # Program shared constants
│   │   ├── errors.rs    # Program custom errors
│   │   ├── lib.rs       # Program entrypoint
├── tests                # TypeScript tests source folder
├── ...                  # Other misc. project config files
└── README.md
```

## Prerequisites

- Install Rust, Solana, Anchor (0.29.0): https://book.anchor-lang.com/chapter_2/installation.html
- Install the [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools#use-solanas-install-tool)
- Install the [Node 18](https://nodejs.org/en/download/package-manager/current)
- M1 Mac? - Use [Anchor Verifiable Builds](https://www.anchor-lang.com/docs/verifiable-builds)

## Development

### Setup steps:

1. In 1st terminal clone the repo and change directory
2. Set the anchor version using `avm use 0.29.0`
3. Run `anchor keys sync` for updating keys in `Cargo.toml` and `lib.rs`
4. Start `solana-test-validator -r` in 2nd terminal

### Building:

1. For building program, run `anchor build` or `anchor build --verifiable`
2. Optional (Only for verifiable builds) - run `cp target/verifiable/solana_uniswap_v2.so target/deploy/solana_uniswap_v2.so`

### Deployment:
1. Set the Solana network using `solana config set --url localnet`
2. For deploying program, run `anchor deploy`

### Running Tests:
- For tests, run `anchor run test`


*Optionally if you are on VS Code, you can use `Tasks: Run Task` option and select `Solana Anchor Dev Pipeline` 
<br> to build, deploy and run tests easily for faster local development. Source code is available [here](./.vscode/tasks.json).*