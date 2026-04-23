function useHotkeyHandler() {
  const { useActiveSymbol, useActiveAccount, usePositions } = api.hooks;
  const [activeSymbol] = useActiveSymbol();
  const [activeAccount] = useActiveAccount();
  const positions = usePositions({ symbol: activeSymbol, account: activeAccount });

  return async () => {
    const pos = positions.find(p => p.symbol === activeSymbol && p.side.toLowerCase() === 'long');
    if (!pos) return api.toast.warning("No Long to sell");

    const market = api.exchange.getMarket(activeSymbol, activeAccount);
    const halfSize = api.utils.math.adjust(pos.contracts * 0.5, market.precision.amount);

    try {
      await api.orders.placeMarketOrder(activeSymbol, activeAccount, api.constants.OrderSide.Sell, {
        amount: halfSize,
        reduceOnly: true
      });
      api.toast.success(`Sold 50% of Long (${halfSize})`);
    } catch (error) {
      api.toast.error(error.message);
    }
  };
}