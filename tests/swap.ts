import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaUniswapV2 } from "../target/types/solana_uniswap_v2";
import { expect } from "chai";
import { TestData, createTestData, expectRevert, mintingTokens } from "./utils";
import { BN } from "bn.js";

describe("Swap tokens", () => {
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

    await program.methods
      .depositLiquidity(values.depositAmountA, values.depositAmountB)
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
  });

  it("Swap from A to B", async () => {
    const input = new BN(10 ** 6);
    await program.methods
      .swap(true, input, new BN(100))
      .accounts({
        amm: values.ammKey,
        pool: values.poolKey,
        poolAuthority: values.poolAuthority,
        trader: values.admin.publicKey,
        mintA: values.mintAKeypair.publicKey,
        mintB: values.mintBKeypair.publicKey,
        poolAccountA: values.poolAccountA,
        poolAccountB: values.poolAccountB,
        traderAccountA: values.holderAccountA,
        traderAccountB: values.holderAccountB,
      })
      .signers([values.admin])
      .rpc({ skipPreflight: true });

    const traderTokenAccountA = await connection.getTokenAccountBalance(
      values.holderAccountA
    );
    const traderTokenAccountB = await connection.getTokenAccountBalance(
      values.holderAccountB
    );
    expect(traderTokenAccountA.value.amount).to.equal(
      values.defaultSupply.sub(values.depositAmountA).sub(input).toString()
    );
    expect(Number(traderTokenAccountB.value.amount)).to.be.greaterThan(
      values.defaultSupply.sub(values.depositAmountB).toNumber()
    );
    expect(Number(traderTokenAccountB.value.amount)).to.be.lessThan(
      values.defaultSupply.sub(values.depositAmountB).add(input).toNumber()
    );
  });

  it("Should fail to swap with insufficient balance", async () => {
    const excessiveInput = values.defaultSupply.add(new BN(1));

    await expectRevert(
      program.methods
        .swap(true, excessiveInput, new BN(100))
        .accounts({
          amm: values.ammKey,
          pool: values.poolKey,
          poolAuthority: values.poolAuthority,
          trader: values.admin.publicKey,
          mintA: values.mintAKeypair.publicKey,
          mintB: values.mintBKeypair.publicKey,
          poolAccountA: values.poolAccountA,
          poolAccountB: values.poolAccountB,
          traderAccountA: values.holderAccountA,
          traderAccountB: values.holderAccountB,
        })
        .signers([values.admin])
        .rpc({ skipPreflight: true })
    );
  });
});
