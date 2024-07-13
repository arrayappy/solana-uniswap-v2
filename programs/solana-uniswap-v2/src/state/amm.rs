use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Amm {
    pub id: Pubkey,
    pub admin: Pubkey,
    pub fee: u16,
}

impl Amm {
    pub const LEN: usize = 8 + 32 + 32 + 2;
}