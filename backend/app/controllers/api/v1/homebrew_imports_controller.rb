# POST /homebrew/import { url, kind: "race" | "class" }
# Returns the extracted homebrew in the editor shape, unsaved, for the
# player to review in the homebrew form.
class Api::V1::HomebrewImportsController < ApplicationController
  include Authenticatable

  def create
    data = HomebrewImporter.call(url: params[:url], kind: params[:kind])
    render json: data, status: :ok
  rescue HomebrewImporter::NotConfigured => e
    render json: { error: e.message }, status: :service_unavailable
  rescue HomebrewImporter::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end
end
