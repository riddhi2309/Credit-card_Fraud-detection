import os
import pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import MinMaxScaler

# ── VAE Architecture ──────────────────────────────────────────────────────────

class VAE(nn.Module):

    def __init__(self, input_dim: int = 30, latent_dim: int = 16):
        super().__init__()
        self.input_dim  = input_dim
        self.latent_dim = latent_dim

        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
        )
        self.fc_mu      = nn.Linear(32, latent_dim)
        self.fc_log_var = nn.Linear(32, latent_dim)

        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, input_dim),
        )

    def encode(self, x):
        h      = self.encoder(x)
        mu     = self.fc_mu(h)
        logvar = self.fc_log_var(h)
        return mu, logvar

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def decode(self, z):
        return self.decoder(z)

    def forward(self, x):
        mu, logvar = self.encode(x)
        z          = self.reparameterize(mu, logvar)
        x_hat      = self.decode(z)
        return x_hat, mu, logvar


def vae_loss(x, x_hat, mu, logvar):
    recon_loss = nn.functional.mse_loss(x_hat, x, reduction="sum")
    kl_loss    = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    return recon_loss + kl_loss


# ── Training ──────────────────────────────────────────────────────────────────

def train():
    try:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        BASE_DIR = os.getcwd()

    # Load preprocessed data
    data_path = os.path.join(BASE_DIR, "../preprocessed_creditcard.csv")
    if not os.path.exists(data_path):
        raise FileNotFoundError(
            f"preprocessed_creditcard.csv not found at {data_path}\n"
            "Run the preprocessing cells in code.ipynb first."
        )

    print("Loading data...")
    df = pd.read_csv(data_path)

    FEATURE_COLS = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]

    # VAE trains on LEGITIMATE transactions only
    legit = df[df["Class"] == False][FEATURE_COLS].copy()
    print(f"Legitimate transactions for training: {len(legit):,}")

    # Normalize all features to [0,1] for VAE
    # (scaler.pkl only covers Time+Amount — we need all 30 features scaled for VAE)
    vae_scaler = MinMaxScaler()
    X = vae_scaler.fit_transform(legit.values).astype(np.float32)

    # Save the VAE-specific scaler
    vae_scaler_path = os.path.join(BASE_DIR, "vae_scaler.pkl")
    with open(vae_scaler_path, "wb") as f:
        pickle.dump(vae_scaler, f)
    print(f"VAE scaler saved to {vae_scaler_path}")

    # DataLoader
    tensor   = torch.tensor(X)
    dataset  = TensorDataset(tensor)
    loader   = DataLoader(dataset, batch_size=256, shuffle=True)

    # Model + optimizer
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training on: {device}")

    model     = VAE(input_dim=30, latent_dim=16).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    # Training loop
    epochs = 50
    print(f"\nTraining VAE for {epochs} epochs...")
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0
        for (batch,) in loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            x_hat, mu, logvar = model(batch)
            loss = vae_loss(batch, x_hat, mu, logvar)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if epoch % 10 == 0 or epoch == 1:
            avg = total_loss / len(dataset)
            print(f"  Epoch {epoch:3d}/{epochs} — loss: {avg:.4f}")

    # Save model weights
    model_path = os.path.join(BASE_DIR, "vae_model.pt")
    torch.save(model.cpu().state_dict(), model_path)
    print(f"\nVAE saved to {model_path}")

    # Compute reconstruction error threshold on legit data
    # Use 95th percentile — anything above this is flagged as anomalous
    print("Computing anomaly threshold...")
    model.eval()
    errors = []
    with torch.no_grad():
        for (batch,) in DataLoader(TensorDataset(tensor), batch_size=512):
            x_hat, _, _ = model(batch)
            err = ((batch - x_hat) ** 2).mean(dim=1)
            errors.extend(err.numpy().tolist())

    threshold = float(np.percentile(errors, 95))
    print(f"Reconstruction error threshold (95th pct): {threshold:.6f}")

    threshold_path = os.path.join(BASE_DIR, "vae_threshold.pkl")
    with open(threshold_path, "wb") as f:
        pickle.dump({"threshold": threshold, "vae_scaler": vae_scaler}, f)
    print(f"Threshold saved to {threshold_path}")

    print("\n✓ Phase 2 complete.")
    print("  Restart your Flask backend or call POST /reload")
    print("  The VAE will activate automatically in the ensemble.\n")


if __name__ == "__main__":
    train()
