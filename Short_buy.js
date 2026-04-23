function useHotkeyHandler() {
  const { useActiveSymbol, useActiveAccount, useBalance, usePositions } = api.hooks;
  const [activeSymbol] = useActiveSymbol();
  const [activeAccount] = useActiveAccount();
  const balance = useBalance(activeAccount);
  const positions = usePositions({ symbol: activeSymbol, account: activeAccount });

  return async () => {
    // --- SETTINGS ---
    const marginPerTrade = 10; // Your $10 Margin
    // ----------------

    const market = api.exchange.getMarket(activeSymbol, activeAccount);
    const ticker = api.exchange.getTicker(activeSymbol, activeAccount);
    const store = api.exchange.getStore(activeAccount);
    const orderForm = api.utils.getOrderForm(activeAccount, activeSymbol);
    
    if (!market || !ticker) return api.toast.error("Market data not loaded");

    // --- ROBUST LEVERAGE DETECTION ---
    // This checks every possible place Tealstreet stores the "Selected" leverage
    const leverage = 
      positions.find(p => p.symbol === activeSymbol)?.leverage || // 1. Active position
      store?.leverage?.[activeSymbol] ||                          // 2. Exchange leverage map
      store?.positions?.find(p => p.symbol === activeSymbol)?.leverage || // 3. Zero-size position info
      orderForm?.leverage ||                                      // 4. The UI slider value
      1;                                                          // 5. Hard default

    api.log.info(`Using detected leverage: ${leverage}x`);

    // --- CALCULATION ---
    let tradeNotional = marginPerTrade * leverage;
    const buyingPower = (balance.free * leverage) * 0.95; 
    
    if (tradeNotional > buyingPower) {
        tradeNotional = buyingPower;
    }

    let amount = tradeNotional / ticker.last;
    
    // Safety Clamp
    if (amount > market.limits.amount.max) amount = market.limits.amount.max;
    
    const adjustedAmount = api.utils.math.adjust(amount, market.precision.amount);

    try {
      // In One-Way mode, "Short Entry" is a Market Sell
      await api.orders.placeMarketOrder(activeSymbol, activeAccount, api.constants.OrderSide.Sell, {
        amount: adjustedAmount,
      });
      api.toast.success(`Short Entry: ${adjustedAmount} SPK (Used $${marginPerTrade} at ${leverage}x)`);
    } catch (error) {
      api.toast.error(error.message);
    }
  };
}