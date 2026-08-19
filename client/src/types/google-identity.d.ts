interface GoogleCredentialResponse {
  credential: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string;
          callback(response: GoogleCredentialResponse): void;
        }): void;
        renderButton(
          element: HTMLElement,
          config: {
            type?: string;
            theme?: string;
            size?: string;
            shape?: string;
            width?: number;
          },
        ): void;
      };
    };
  };
}
