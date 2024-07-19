use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount, Transfer},
};
use fixed::types::I64F64;
use fixed_sqrt::FixedSqrt;

use crate::{
    constants::{AUTHORITY_SEED, LIQUIDITY_SEED, MIN_LIQUIDITY},
    errors::CustomError,
    state::Pool,
};

impl<'info> DepositLiquidity<'info> {
    pub fn deposit_liquidity(
        &mut self,
        amount_a: u64,
        amount_b: u64,
        bumps: &DepositLiquidityBumps,
    ) -> Result<()> {
        let mut amount_a = amount_a;
        let mut amount_b = amount_b;

        // Ensure deposit ratio with existing pool liquidity
        let pool_a = &self.pool_account_a;
        let pool_b = &self.pool_account_b;
        // CAUTION: Current pool creation logic vulnerable to frontrunning attacks
        let pool_creation = pool_a.amount == 0 && pool_b.amount == 0;
        (amount_a, amount_b) = if pool_creation {
            // Add as is if there is no liquidity
            (amount_a, amount_b)
        } else {
            let ratio = I64F64::from_num(pool_a.amount)
                .checked_mul(I64F64::from_num(pool_b.amount))
                .unwrap();
            if pool_a.amount > pool_b.amount {
                (
                    I64F64::from_num(amount_b)
                        .checked_mul(ratio)
                        .unwrap()
                        .to_num::<u64>(),
                    amount_b,
                )
            } else {
                (
                    amount_a,
                    I64F64::from_num(amount_a)
                        .checked_div(ratio)
                        .unwrap()
                        .to_num::<u64>(),
                )
            }
        };

        // Calculate liquidity tokens to be deposited
        let mut liquidity = I64F64::from_num(amount_a)
            .checked_add(I64F64::from_num(amount_b))
            .unwrap()
            .sqrt()
            .to_num::<u64>();

        // Reserve minimum liquidity for initial deposit to prevent draining
        if pool_creation {
            if liquidity < MIN_LIQUIDITY {
                return err!(CustomError::InsufficientDepositAmount);
            }

            liquidity -= MIN_LIQUIDITY;
        }

        // Execute token transfer to pool accounts
        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.depositor_account_a.to_account_info(),
                    to: self.pool_account_a.to_account_info(),
                    authority: self.depositor.to_account_info(),
                },
            ),
            amount_a,
        )?;
        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.depositor_account_b.to_account_info(),
                    to: self.pool_account_b.to_account_info(),
                    authority: self.depositor.to_account_info(),
                },
            ),
            amount_b,
        )?;

        // Mint and distribute liquidity tokens to depositor
        let authority_bump = bumps.pool_authority;
        let authority_seeds = &[
            &self.pool.amm.to_bytes(),
            &self.mint_a.key().to_bytes(),
            &self.mint_b.key().to_bytes(),
            AUTHORITY_SEED.as_bytes(),
            &[authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];
        token::mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                MintTo {
                    mint: self.mint_liquidity.to_account_info(),
                    to: self.depositor_account_liquidity.to_account_info(),
                    authority: self.pool_authority.to_account_info(),
                },
                signer_seeds,
            ),
            liquidity,
        )?;

        Ok(())
    }
}
#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(
        seeds = [
            pool.amm.as_ref(),
            pool.mint_a.key().as_ref(),
            pool.mint_b.key().as_ref(),
        ],
        bump,
        has_one = mint_a,
        has_one = mint_b,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Read only authority
    #[account(
        seeds = [
            pool.amm.as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            AUTHORITY_SEED.as_ref(),
        ],
        bump,
    )]
    pub pool_authority: AccountInfo<'info>,

    /// Payer
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            pool.amm.as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            LIQUIDITY_SEED.as_ref(),
        ],
        bump,
    )]
    pub mint_liquidity: Box<Account<'info, Mint>>,

    pub mint_a: Box<Account<'info, Mint>>,

    pub mint_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_b: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_liquidity,
        associated_token::authority = depositor,
    )]
    pub depositor_account_liquidity: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_a,
        associated_token::authority = depositor,
    )]
    pub depositor_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_b,
        associated_token::authority = depositor,
    )]
    pub depositor_account_b: Box<Account<'info, TokenAccount>>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Solana accounts
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
