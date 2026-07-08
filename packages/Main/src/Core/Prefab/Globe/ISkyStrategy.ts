interface ISkyStrategy {
    enabled: boolean;
    readonly ready: boolean;
    update(): void;
    dispose(): void;
}
export default ISkyStrategy;
