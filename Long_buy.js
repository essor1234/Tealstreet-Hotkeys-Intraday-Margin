function useHotkeyHandler() {
  const { useActiveSymbol, useActiveAccount, useBalance, usePositions } = api.hooks;
  const [activeSymbol] = useActiveSymbol();
  const [activeAccount] = useActiveAccount();
  const balance = useBalance(activeAccount);
  const positions = usePositions({ symbol: activeSymbol, account: activeAccount });

  return async () => {
    // --- SETTINGS ---
    const marginPerTrade = 10; // The amount of YOUR money ($) to use per trade
    // ----------------

    const market = api.exchange.getMarket(activeSymbol, activeAccount);
    const ticker = api.exchange.getTicker(activeSymbol, activeAccount);
    const store = api.exchange.getStore(activeAccount);
    
    if (!market || !ticker) return api.toast.error("Market data not loaded");

    // 1. DYNAMIC LEVERAGE DETECTION
    // Looks for the 10x you see in your [C,H] display
    const activePos = positions.find(p => p.symbol === activeSymbol);
    const storeLev = store?.leverage?.[activeSymbol];
    const emptyPos = store?.positions?.find(p => p.symbol === activeSymbol);

    const leverage = activePos?.leverage || storeLev || emptyPos?.leverage || 1;

    // 2. AMPLIFIED MATH
    // Total Value = Your $10 * 10x Leverage = $100 Total
    let tradeNotional = marginPerTrade * leverage;

    // 3. SAFETY CHECKS
    const buyingPower = (balance.free * leverage) * 0.95; // Max you can actually afford
    if (tradeNotional > buyingPower) {
        api.log.warn("Trade size exceeds buying power. Using max available.");
        tradeNotional = buyingPower;
    }

    // 4. EXCHANGE LIMIT CHECK (Prevents "Too Large" error)
    let amount = tradeNotional / ticker.last;
    const maxQty = market.limits.amount.max;
    if (amount > maxQty) {
      api.log.warn(`Capping at exchange max: ${maxQty}`);
      amount = maxQty;
    }
    
    // Final rounding for the exchange
    const adjustedAmount = api.utils.math.adjust(amount, market.precision.amount);

    try {
      await api.orders.placeMarketOrder(activeSymbol, activeAccount, api.constants.OrderSide.Buy, {
        amount: adjustedAmount,
      });
      // Toast now shows both your Margin and the Total Amplified size
      api.toast.success(`Long: ${adjustedAmount} ${market.base} (Used $${marginPerTrade} at ${leverage}x)`);
    } catch (error) {
      api.toast.error(error.message);
    }
  };
}