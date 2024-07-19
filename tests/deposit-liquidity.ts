import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaUniswapV2 } from "../target/types/solana_uniswap_v2";
import { expect } from "chai";
import { TestData, createTestData, expectRevert, mintingTokens } from "./utils";

describe("Deposit liquidity", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaUniswapV2 as Program<SolanaUniswapV2>;

  let values: TestData;

  beforeEach(async () => {
    values = createTestData();

    await program.methods
      .initializeAmm(values.id, values.fee)
      .accounts({ amm: values.ammKey, admin: values.admin.publicKey })
      .rpc();

    await mintingTokens({
      connection,
      creator: values.admin,
      mintAKeypair: values.mintAKeypair,
      mintBKeypair: values.mintBKeypair,
    });

    await program.methods
      .initializePool()
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        poolAuthority: values.poolAuthority,
        mintLiquidity: values.mintLiquidity,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: values.poolAccountA,
        poolAccountB: values.poolAccountB,
      })
      .rpc();
  });

  it("Deposit equal amounts", async () => {
    await program.methods
      .depositLiquidity(values.depositAmountA, values.depositAmountA)
      .accounts({
        pool: values.poolKey,
        poolAuthority: values.poolAuthority,
        depositor: values.admin.publicKey,
        mintLiquidity: values.mintLiquidity,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: values.poolAccountA,
        poolAccountB: values.poolAccountB,
        depositorAccountLiquidity: values.liquidityAccount,
        depositorAccountA: values.holderAccountA,
        depositorAccountB: values.holderAccountB,
      })
      .signers([values.admin])
      .rpc({ skipPreflight: true });

    const depositTokenAccountLiquditiy =
      await connection.getTokenAccountBalance(values.liquidityAccount);
    expect(depositTokenAccountLiquditiy.value.amount).to.equal(
      values.depositAmountA.sub(values.minimumLiquidity).toString()
    );
    const depositTokenAccountA = await connection.getTokenAccountBalance(
      values.holderAccountA
    );
    expect(depositTokenAccountA.value.amount).to.equal(
      values.defaultSupply.sub(values.depositAmountA).toString()
    );
    const depositTokenAccountB = await connection.getTokenAccountBalance(
      values.holderAccountB
    );
    expect(depositTokenAccountB.value.amount).to.equal(
      values.defaultSupply.sub(values.depositAmountA).toString()
    );
  });
});
