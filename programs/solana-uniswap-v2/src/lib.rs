use anchor_lang::prelude::*;

declare_id!("uni89rwTPZo2AV5jWCv5Jx4GNDWAqc54BePQKcttmUa");

#[program]
pub mod solana_uniswap_v2 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
